#!/usr/bin/env python3
"""Render a vid-assembly timeline (timeline.json) to a finished video with FFmpeg.

Pipeline (each stage is logged to build/<mode>/render_report.json):
  1. validate   - resolve the timeline; refuse to render if it has errors
  2. segments   - conform every clip to the delivery raster, frame rate and audio format
                  (cached: unchanged clips are not re-encoded on the next run)
  3. mix        - join clip audio with the same transitions as the picture, add
                  narration, music (ducked under narration) and SFX -> premix.wav
  4. loudness   - measure the premix (EBU R128) for two-pass loudness normalisation
  5. master     - join the picture (cuts / xfade transitions), draw titles, burn or
                  attach captions, normalise loudness, encode the deliverable
  6. qc         - probe and check the file that was actually written (see qc_output.py)

Usage:
  python render.py project/timeline.json --preview      # fast low-res proxy for review
  python render.py project/timeline.json                # full-quality master
  python render.py project/timeline.json --dry-run      # print the plan, render nothing

Exit status is 0 only when an output file was written and passed QC without
failures. The last line printed always states plainly whether a file exists.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

RENDER_VERSION = 3
# Segment cache keys include the engine's own source, so changing the code never reuses stale segments.
CODE_SIG = V.stable_hash([Path(__file__).read_text(encoding="utf-8"),
                          (Path(__file__).parent / "vidlib.py").read_text(encoding="utf-8")])
MOTION_PRESETS = {
    "none": None,
    "push_in": {"zoom": [1.0, 1.12], "pan": "center"},
    "push_in_slow": {"zoom": [1.0, 1.06], "pan": "center"},
    "pull_out": {"zoom": [1.12, 1.0], "pan": "center"},
    "pan_left_to_right": {"zoom": [1.12, 1.12], "pan": "left_to_right"},
    "pan_right_to_left": {"zoom": [1.12, 1.12], "pan": "right_to_left"},
    "tilt_up": {"zoom": [1.12, 1.12], "pan": "up"},
    "tilt_down": {"zoom": [1.12, 1.12], "pan": "down"},
}
DEFAULT_STILL_MOTION = "push_in_slow"


def q(expr: str) -> str:
    """Quote a filter option value that contains commas or other separators."""
    return "'" + expr.replace("'", "") + "'"


def num(x: float) -> str:
    return f"{x:.6f}".rstrip("0").rstrip(".") if "." in f"{x:.6f}" else str(x)


def atempo_chain(speed: float) -> list[str]:
    parts, s = [], speed
    while s > 2.0:
        parts.append(2.0)
        s /= 2.0
    while s < 0.5:
        parts.append(0.5)
        s /= 0.5
    parts.append(s)
    return [f"atempo={num(p)}" for p in parts if abs(p - 1.0) > 1e-6]


def fit_font_size(line: str, size: float, max_width: float) -> float:
    """Shrink a font size so an estimated line width stays inside max_width (no overflow off-frame)."""
    est = 0.0
    for ch in line:
        if ch.isspace():
            est += 0.30
        elif ch.isupper() or ch.isdigit():
            est += 0.70
        elif ch.islower():
            est += 0.54
        else:
            est += 0.40
    est *= size
    return size * (max_width / est) if est > max_width else size


def alpha_expr(start: float, end: float, fade: float) -> str:
    if fade <= 0:
        return f"if(between(t,{num(start)},{num(end)}),1,0)"
    a, b, f = num(start), num(end), num(fade)
    return (f"if(lt(t,{a}),0,if(lt(t,{a}+{f}),(t-{a})/{f},"
            f"if(lt(t,{b}-{f}),1,if(lt(t,{b}),({b}-t)/{f},0))))")


class Renderer:
    def __init__(self, tl: dict, args):
        self.tl = tl
        self.args = args
        self.base = Path(tl["base_dir"])
        self.out = dict(tl["output"])
        self.fps = self.out["fps"]
        self.preview = args.preview
        W, H = self.out["width"], self.out["height"]
        if self.preview:
            scale = min(1.0, args.preview_size / max(W, H))
            W, H = int(W * scale) // 2 * 2, int(H * scale) // 2 * 2
        self.W, self.H = W, H
        self.mode = "preview" if self.preview else "master"
        self.build = self.base / "build" / self.mode
        self.build_rel = Path("build") / self.mode
        self.report = {"render_version": RENDER_VERSION, "mode": self.mode, "timeline": tl["path"],
                       "started": time.strftime("%Y-%m-%dT%H:%M:%S"), "stages": [], "warnings": list(tl["warnings"]),
                       "output": None, "rendered": False}
        self.ten_bit = "10" in str(self.out.get("pix_fmt", ""))
        self.fonts: dict[str, str] = {}

    # ------------------------------------------------------------------ utils
    def log(self, msg):
        print(msg, flush=True)

    def ffmpeg(self, cmd, stage, label=""):
        full = ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error"] + cmd
        entry = {"stage": stage, "label": label, "cmd": full}
        if self.args.dry_run:
            self.report["stages"].append(entry)
            if self.args.verbose:
                self.log("  $ " + " ".join(full))
            return None
        t0 = time.time()
        proc = V.run(full, cwd=self.base, check=False)
        entry["seconds"] = round(time.time() - t0, 2)
        entry["returncode"] = proc.returncode
        if proc.returncode != 0:
            entry["stderr_tail"] = (proc.stderr or "")[-3000:]
            self.report["stages"].append(entry)
            raise RuntimeError(f"{stage} {label} failed:\n{(proc.stderr or '').strip()[-1500:]}")
        self.report["stages"].append(entry)
        return proc

    def font(self, spec: str | None) -> str:
        """Copy the resolved font into build/fonts and return a filter-safe relative path."""
        spec = spec or "Sans"
        if spec in self.fonts:
            return self.fonts[spec]
        src = V.resolve_font(spec)
        if not src:
            raise RuntimeError(f"No font file found for {spec!r}; install fontconfig or give a font path")
        dest_dir = self.build / "fonts"
        name = f"f{len(self.fonts)}{Path(src).suffix.lower()}"
        if not self.args.dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest_dir / name)
        rel = (self.build_rel / "fonts" / name).as_posix()
        self.fonts[spec] = rel
        return rel

    def textfile(self, name: str, text: str) -> str:
        path = self.build / "text" / f"{name}.txt"
        if not self.args.dry_run:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        return (self.build_rel / "text" / f"{name}.txt").as_posix()

    def drawtext(self, name, text, size, x, y, color="white", alpha=None, font=None,
                 box=False, box_color="black", box_opacity=0.45, shadow=True, enable=None):
        parts = [f"fontfile={self.font(font)}", f"textfile={self.textfile(name, text)}",
                 "expansion=none", f"fontsize={int(round(size))}", f"fontcolor={color}",
                 f"x={q(x)}", f"y={q(y)}"]
        if shadow and not box:
            parts += ["shadowcolor=black@0.55", f"shadowx={max(1, int(size / 22))}",
                      f"shadowy={max(1, int(size / 22))}"]
        if box:
            parts += ["box=1", f"boxcolor={box_color}@{box_opacity}", f"boxborderw={max(4, int(size * 0.38))}"]
        if alpha:
            parts.append(f"alpha={q(alpha)}")
        if enable:
            parts.append(f"enable={q(enable)}")
        return "drawtext=" + ":".join(parts)

    # ------------------------------------------------------------ fit / grade
    def fit_graph(self, src, dst, fit, prefix):
        W, H, bg = self.W, self.H, self.out.get("background", "black")
        if fit == "crop":
            return [f"{src}scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H}{dst}"]
        if fit == "pad":
            return [f"{src}scale={W}:{H}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos,"
                    f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={bg}{dst}"]
        # blur: soft, darkened fill of the same image behind the full frame (common for 9:16 from 16:9)
        sw, sh = max(2, W // 4 // 2 * 2), max(2, H // 4 // 2 * 2)
        return [f"{src}split=2[{prefix}ba][{prefix}fa]",
                f"[{prefix}ba]scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
                f"gblur=sigma=12,eq=brightness=-0.10:saturation=0.75,scale={W}:{H}[{prefix}bg]",
                f"[{prefix}fa]scale={W}:{H}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos[{prefix}fg]",
                f"[{prefix}bg][{prefix}fg]overlay=(W-w)/2:(H-h)/2{dst}"]

    def pre_filters(self, clip):
        f = []
        info = clip.get("info") or {}
        sar = info.get("sar") or "1:1"
        if sar not in ("1:1", "0:1", "N/A"):
            f.append("scale=trunc(iw*sar/2)*2:ih,setsar=1")  # anamorphic -> square pixels
        pix = str(info.get("pix_fmt") or "")
        if clip["type"] == "image" and any(t in pix for t in ("rgba", "argb", "bgra", "abgr", "ya8", "ya16",
                                                              "yuva", "pal8", "gbrap", "rgba64")):
            f.append("format=rgba,premultiply=inplace=1")  # transparent areas -> black
        return f

    def post_filters(self, clip):
        f = []
        g = V.GRADE_PRESETS.get(clip.get("grade") or "none", "")
        if g:
            f.append(g)
        if clip.get("vf"):
            f.append(str(clip["vf"]))
        return f

    def motion_spec(self, clip):
        m = clip.get("motion")
        if m is None and (clip["type"] == "image" or clip.get("freeze")):
            m = DEFAULT_STILL_MOTION
        if isinstance(m, str):
            if m not in MOTION_PRESETS:
                raise RuntimeError(f"clip {clip['id']}: unknown motion preset {m!r}; known: {', '.join(MOTION_PRESETS)}")
            m = MOTION_PRESETS[m]
        if not m:
            return None
        spec = {"zoom": [1.0, 1.08], "pan": "center", "ease": True}
        spec.update(m)
        return spec

    def zoompan(self, clip, spec):
        N = clip["frames"]
        zs, ze = (float(z) for z in spec["zoom"])
        if min(zs, ze) < 1.0:
            raise RuntimeError(f"clip {clip['id']}: zoom values must be >= 1.0")
        P = f"min(1,on/{max(1, N - 1)})"
        E = f"(3*pow({P},2)-2*pow({P},3))" if spec.get("ease", True) else P
        z = f"{num(zs)}+({num(ze - zs)})*{E}"
        pan = spec.get("pan", "center")
        focus = spec.get("focus")
        cx, cy = "(iw-iw/zoom)/2", "(ih-ih/zoom)/2"
        if focus:
            fx, fy = (float(v) for v in focus)
            x = f"max(0,min(iw-iw/zoom,(0.5+({num(fx)}-0.5)*{E})*iw-iw/zoom/2))"
            y = f"max(0,min(ih-ih/zoom,(0.5+({num(fy)}-0.5)*{E})*ih-ih/zoom/2))"
        elif pan == "left_to_right":
            x, y = f"(iw-iw/zoom)*{E}", cy
        elif pan == "right_to_left":
            x, y = f"(iw-iw/zoom)*(1-{E})", cy
        elif pan == "down":
            x, y = cx, f"(ih-ih/zoom)*{E}"
        elif pan == "up":
            x, y = cx, f"(ih-ih/zoom)*(1-{E})"
        elif pan == "center":
            x, y = cx, cy
        else:
            raise RuntimeError(f"clip {clip['id']}: unknown pan {pan!r}")
        k = min(3.0, max(1.5, 6000 / self.W))
        bw, bh = int(self.W * k) // 2 * 2, int(self.H * k) // 2 * 2
        return (f"scale={bw}:{bh}:flags=lanczos,"
                f"zoompan=z={q(z)}:x={q(x)}:y={q(y)}:d={N}:s={self.W}x{self.H}:fps={V.fps_str(self.fps)}")

    # --------------------------------------------------------------- segments
    def segment_key(self, clip):
        keep = {k: v for k, v in clip.items() if k not in ("info", "index", "start", "end", "start_frame",
                                                           "end_frame", "transition", "description", "note",
                                                           "label", "source")}
        sig = V.file_signature(clip["source"]) if clip.get("source") else None
        fonts = {"font": V.resolve_font((clip.get("style") or {}).get("font"))} if clip["type"] == "title" else {}
        return V.stable_hash([RENDER_VERSION, CODE_SIG, keep, sig, fonts, self.W, self.H, V.fps_str(self.fps),
                              self.preview, self.ten_bit, self.out.get("background")])

    def segment_cmd(self, clip, out_rel):
        W, H, fps = self.W, self.H, self.fps
        N, D = clip["frames"], clip["seconds"]
        fpsv = V.fps_str(fps)
        inputs, g = [], []
        has_src_audio = False
        motion = None
        pix = "yuv422p10le" if self.ten_bit else "yuv420p"
        if clip["type"] == "video":
            info = clip.get("info") or {}
            span = clip["out"] - clip["in"]
            inputs += ["-ss", num(clip["in"]), "-t", num(span + 1.0), "-i", clip["source"]]
            chain = ["setpts=PTS-STARTPTS"]
            fo = str(info.get("field_order", "unknown"))
            if clip["deinterlace"] is True or (clip["deinterlace"] == "auto" and fo in ("tt", "bb", "tb", "bt")):
                chain.append("bwdif=mode=send_frame")
            if clip.get("freeze"):
                chain += ["trim=end_frame=1"] + self.pre_filters(clip)
                motion = self.motion_spec(clip)
                g.append("[0:v]" + ",".join(chain) + "[pre]")
            else:
                if abs(clip["speed"] - 1.0) > 1e-6:
                    chain.append(f"setpts=PTS/{num(clip['speed'])}")
                chain.append(f"fps={fpsv}")
                chain += self.pre_filters(clip)
                g.append("[0:v]" + ",".join(chain) + "[pre]")
            has_src_audio = clip["audio"] and info.get("has_audio") and not clip.get("freeze")
        elif clip["type"] == "image":
            motion = self.motion_spec(clip)
            if motion:
                inputs += ["-i", clip["source"]]
            else:
                inputs += ["-loop", "1", "-framerate", fpsv, "-t", num(D + 1.0), "-i", clip["source"]]
            pre = self.pre_filters(clip) or ["null"]
            g.append("[0:v]" + ",".join(pre) + "[pre]")
        else:  # color / title
            color = clip.get("color") or "black"
            inputs += ["-f", "lavfi", "-i", f"color=c={color}:s={W}x{H}:r={fpsv}:d={num(D + 1.0)}"]
            g.append("[0:v]null[pre]")

        if clip["type"] in ("color", "title"):
            g.append("[pre]null[fit]")
        else:
            g += self.fit_graph("[pre]", "[fit]", clip["fit"], "s")

        post = []
        if motion:
            post.append(self.zoompan(clip, motion))
        else:
            post.append(f"fps={fpsv}")
        post += self.post_filters(clip)
        post += ["setsar=1", f"format={pix}", "tpad=stop_mode=clone:stop_duration=2",
                 f"trim=end_frame={N}", "setpts=PTS-STARTPTS"]
        if clip["type"] == "title":
            post += self.title_filters(clip)
        if clip["fade_in"] > 0:
            post.append(f"fade=t=in:st=0:d={num(clip['fade_in'])}")
        if clip["fade_out"] > 0:
            post.append(f"fade=t=out:st={num(max(0.0, D - clip['fade_out']))}:d={num(clip['fade_out'])}")
        g.append("[fit]" + ",".join(post) + "[v]")

        # audio: source audio, or silence of exactly the same length
        afilt = []
        if has_src_audio:
            afilt = ["asetpts=PTS-STARTPTS", "aresample=48000",
                     "aformat=sample_fmts=fltp:channel_layouts=stereo"]
            afilt += atempo_chain(clip["speed"])
            if clip["audio_gain_db"]:
                afilt.append(f"volume={num(clip['audio_gain_db'])}dB")
            src_a = "[0:a]"
        else:
            inputs += ["-f", "lavfi", "-t", num(D + 1.0), "-i", "anullsrc=r=48000:cl=stereo"]
            src_a = "[1:a]"
        afilt += ["apad", f"atrim=duration={num(D)}", "asetpts=PTS-STARTPTS"]
        if clip["fade_in"] > 0:
            afilt.append(f"afade=t=in:st=0:d={num(clip['fade_in'])}")
        if clip["fade_out"] > 0:
            afilt.append(f"afade=t=out:st={num(max(0.0, D - clip['fade_out']))}:d={num(clip['fade_out'])}")
        g.append(src_a + ",".join(afilt) + "[a]")

        if self.ten_bit:
            venc = ["-c:v", "ffv1", "-level", "3"]
        elif self.preview:
            venc = ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "24"]
        else:
            venc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "12"]
        return inputs + ["-filter_complex", ";".join(g), "-map", "[v]", "-map", "[a]", *venc,
                         "-frames:v", str(N), "-c:a", "pcm_f32le", "-ar", "48000", "-f", "matroska", out_rel]

    def title_filters(self, clip):
        st = clip.get("style") or {}
        W, H = self.W, self.H
        scale = H / self.out["height"]
        short = min(W, H)
        lines = [l for l in str(clip.get("text") or "").split("\n")]
        sub = [l for l in str(clip.get("subtext") or "").split("\n") if l] if clip.get("subtext") else []
        size = float(st["size"]) * scale if st.get("size") else 0.065 * short
        size = min([size] + [fit_font_size(l, size, 0.9 * W) for l in lines if l.strip()])
        sub_size = float(st["subtext_size"]) * scale if st.get("subtext_size") else size * 0.5
        sub_size = min([sub_size] + [fit_font_size(l, sub_size, 0.9 * W) for l in sub])
        color = st.get("color", "white")
        font = st.get("font", "Sans")
        sub_font = st.get("subtext_font", font)
        fade = float(st.get("text_fade", 0.6))
        D = clip["seconds"]
        alpha = alpha_expr(min(0.25, D / 6), D - min(0.15, D / 10), min(fade, D / 4))
        lh, slh = size * 1.25, sub_size * 1.35
        block = len(lines) * lh + (size * 0.5 + len(sub) * slh if sub else 0)
        y0 = (H - block) / 2
        out = []
        for i, line in enumerate(lines):
            if line.strip():
                out.append(self.drawtext(f"{V.slugify(clip['id'])}_t{i}", line, size, "(w-text_w)/2",
                                         num(y0 + i * lh), color, alpha, font))
        ys = y0 + len(lines) * lh + size * 0.5
        for i, line in enumerate(sub):
            out.append(self.drawtext(f"{V.slugify(clip['id'])}_s{i}", line, sub_size, "(w-text_w)/2",
                                     num(ys + i * slh), st.get("subtext_color", color), alpha, sub_font))
        return out

    # ----------------------------------------------------------------- joins
    @staticmethod
    def join_graph(clips, kind, label_of, out_label):
        """Join per-clip streams with cuts (concat) and transitions (xfade/acrossfade)."""
        stmts, pending, n = [], [], 0
        letter = "v" if kind == "v" else "a"
        # concat and xfade only join streams with identical time bases: normalise every input first
        raw_label_of = label_of
        norm = {}
        for i in range(len(clips)):
            lab = f"[{letter}n{i}]"
            if kind == "v":
                stmts.append(f"{raw_label_of(i)}settb=AVTB,setpts=PTS-STARTPTS{lab}")
            else:
                stmts.append(f"{raw_label_of(i)}asettb=1/48000,asetpts=PTS-STARTPTS{lab}")
            norm[i] = lab
        label_of = norm.__getitem__

        def flush():
            nonlocal n
            if len(pending) == 1:
                return pending[0]
            n += 1
            lab = f"[{letter}c{n}]"
            vv = "v=1:a=0" if kind == "v" else "v=0:a=1"
            stmts.append("".join(pending) + f"concat=n={len(pending)}:{vv}{lab}")
            return lab

        for i, c in enumerate(clips):
            lab = label_of(i)
            t = c["transition"]
            if i == 0 or not t["frames"]:
                pending.append(lab)
                continue
            cur = flush()
            n += 1
            xl = f"[{letter}x{n}]"
            if kind == "v":
                stmts.append(f"{cur}{lab}xfade=transition={t['xfade']}:duration={num(t['duration'])}:"
                             f"offset={num(c['start'])}{xl}")
            else:
                curve = "qsin" if t["xfade"] in ("fade", "hblur", "fadegrays", "dissolve") else "tri"
                stmts.append(f"{cur}{lab}acrossfade=d={num(t['duration'])}:c1={curve}:c2={curve}{xl}")
            pending[:] = [xl]
        final = flush()
        stmts.append(f"{final}{'null' if kind == 'v' else 'anull'}{out_label}")
        return stmts

    # ------------------------------------------------------------------- mix
    def norm_gain(self, it) -> float:
        """Static gain that brings a narration/music item to mix.reference_lufs (0 if disabled)."""
        mix = self.tl["mix"]
        if not mix.get("normalize_sources", True):
            return 0.0
        key = (it["source"], round(it["in"], 3), round(it["duration"], 3))
        cache = self.report.setdefault("source_loudness", {})
        ck = f"{Path(it['source']).name}@{key[1]}+{key[2]}"
        if ck in cache:
            return cache[ck]["gain_db"]
        if self.args.dry_run:
            return 0.0
        span = min(it["duration"], 600.0)
        cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-ss", num(it["in"]), "-t", num(span)]
        if it.get("loop"):
            cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-stream_loop", "-1", "-ss", num(it["in"]),
                   "-t", num(span)]
        cmd += ["-i", it["source"], "-af", "loudnorm=print_format=json", "-f", "null", "-"]
        proc = V.run(cmd, check=False)
        txt = proc.stderr or ""
        gain = 0.0
        measured = None
        try:
            measured = float(json.loads(txt[txt.rfind("{"): txt.rfind("}") + 1])["input_i"])
        except (ValueError, KeyError, json.JSONDecodeError):
            measured = None
        if measured is not None and V.is_finite(measured) and measured > -70:
            gain = max(-30.0, min(20.0, float(mix.get("reference_lufs", -18.0)) - measured))
        else:
            self.report["warnings"].append(f"could not measure loudness of {Path(it['source']).name}; used as is")
        cache[ck] = {"measured_lufs": measured, "gain_db": round(gain, 2)}
        return gain

    def mix_cmd(self, seg_paths, out_rel):
        tl, total = self.tl, self.tl["total_seconds"]
        inputs = []
        for p in seg_paths:
            inputs += ["-i", p]
        g = self.join_graph(tl["clips"], "a", lambda i: f"[{i}:a]", "[prog0]")
        idx = len(seg_paths)
        mix = tl["mix"]
        bus = mix.get("bus_gain_db", {})

        def pad(lbl, out):
            g.append(f"{lbl}apad,atrim=duration={num(total)},asetpts=PTS-STARTPTS{out}")

        def item_chain(it, i_idx, tag):
            ch = [f"atrim=start={num(it['in'])}:duration={num(it['duration'])}", "asetpts=PTS-STARTPTS",
                  "aresample=48000", "aformat=sample_fmts=fltp:channel_layouts=stereo"]
            gain = it["gain_db"] + (self.norm_gain(it) if tag[0] in "nm" else 0.0)
            if abs(gain) > 0.01:
                ch.append(f"volume={num(round(gain, 2))}dB")
            if it["fade_in"] > 0:
                ch.append(f"afade=t=in:st=0:d={num(it['fade_in'])}")
            if it["fade_out"] > 0:
                ch.append(f"afade=t=out:st={num(max(0.0, it['duration'] - it['fade_out']))}:d={num(it['fade_out'])}")
            ms = int(round(it["start"] * 1000))
            if ms > 0:
                ch.append(f"adelay={ms}|{ms}")
            lab = f"[{tag}]"
            g.append(f"[{i_idx}:a]" + ",".join(ch) + lab)
            return lab

        def bus_of(items, name, prefix):
            nonlocal idx
            if not items:
                return None
            labs = []
            for k, it in enumerate(items):
                if it.get("loop"):
                    inputs.extend(["-stream_loop", "-1"])
                inputs.extend(["-i", it["source"]])
                labs.append(item_chain(it, idx, f"{prefix}{k}"))
                idx += 1
            raw = f"[{name}raw]"
            if len(labs) == 1:
                g.append(f"{labs[0]}anull{raw}")
            else:
                g.append("".join(labs) + f"amix=inputs={len(labs)}:normalize=0:duration=longest{raw}")
            bus_key = {"narr": "narration", "mus": "music", "mus_nd": "music", "sfx": "sfx"}[name]
            gain = float(bus.get(bus_key, 0.0) or 0.0)
            gl = f"[{name}g]"
            g.append(f"{raw}volume={num(gain)}dB{gl}")
            out = f"[{name}]"
            pad(gl, out)
            return out

        g.append(f"[prog0]volume={num(float(bus.get('program', 0.0) or 0.0))}dB[prog1]")
        pad("[prog1]", "[prog]")
        narr = bus_of(tl["narration"], "narr", "n")
        mus_d = bus_of([m for m in tl["music"] if m["duck"]], "mus", "m")
        mus_nd = bus_of([m for m in tl["music"] if not m["duck"]], "mus_nd", "mn")
        sfx = bus_of(tl["sfx"], "sfx", "x")

        duck = mix.get("ducking", {})
        prog = "[prog]"
        targets = set(duck.get("targets", ["music", "program"]))
        if narr and duck.get("enabled", True):
            want = [t for t in (("music", mus_d), ("program", prog)) if t[0] in targets and t[1]]
            if want:
                keys = [f"[nkey{i}]" for i in range(len(want))]
                g.append(f"{narr}asplit={len(want) + 1}[narrmix]" + "".join(keys))
                narr = "[narrmix]"
                # Narration sits near reference_lufs (sources are normalised), so a threshold
                # 14 dB below it and a ratio derived from amount_db give a predictable duck depth.
                ref = float(mix.get("reference_lufs", -18.0))
                margin = 14.0
                amount = min(float(duck.get("amount_db", 10.0)), margin * 0.95)
                threshold = float(duck["threshold"]) if "threshold" in duck else V.db_to_linear(ref - margin)
                ratio = float(duck["ratio"]) if "ratio" in duck else min(20.0, 1.0 / max(0.05, 1 - amount / margin))
                threshold = min(1.0, max(0.000977, threshold))
                sc = (f"sidechaincompress=threshold={threshold:.5f}:ratio={num(round(ratio, 3))}:knee=2:"
                      f"attack={num(float(duck.get('attack', 20)))}:release={num(float(duck.get('release', 500)))}")
                for (name, lab), key in zip(want, keys):
                    out = f"[{name}duck]"
                    g.append(f"{lab}{key}{sc}{out}")
                    if name == "music":
                        mus_d = out
                    else:
                        prog = out
        buses = [b for b in (prog, narr, mus_d, mus_nd, sfx) if b]
        if len(buses) == 1:
            g.append(f"{buses[0]}anull[mix]")
        else:
            g.append("".join(buses) + f"amix=inputs={len(buses)}:normalize=0:duration=first:dropout_transition=0[mix]")
        g.append(f"[mix]atrim=duration={num(total)},asetpts=PTS-STARTPTS[aout]")
        return inputs + ["-filter_complex", ";".join(g), "-map", "[aout]", "-c:a", "pcm_f32le",
                         "-ar", "48000", out_rel]

    def measure_loudness(self, premix_rel):
        L = self.out.get("loudness")
        if not L:
            return None
        cmd = ["-i", premix_rel, "-af",
               f"loudnorm=I={num(L['target_lufs'])}:TP={num(L['true_peak'])}:LRA={num(L.get('lra', 11))}:print_format=json",
               "-f", "null", "-"]
        if self.args.dry_run:
            self.ffmpeg(cmd, "loudness", "measure")
            return {"input_i": "-23", "input_tp": "-1", "input_lra": "7", "input_thresh": "-33",
                    "target_offset": "0"}
        full = ["ffmpeg", "-hide_banner", "-nostdin", "-y"] + cmd
        proc = V.run(full, cwd=self.base, check=False)
        self.report["stages"].append({"stage": "loudness", "cmd": full, "returncode": proc.returncode})
        txt = proc.stderr or ""
        start = txt.rfind("{")
        try:
            data = json.loads(txt[start: txt.rfind("}") + 1])
        except (ValueError, json.JSONDecodeError):
            self.report["warnings"].append("loudness measurement failed; normalisation skipped")
            return None
        if not V.is_finite(data.get("input_i")) or float(data["input_i"]) < -70:
            self.report["warnings"].append("program audio is silent or nearly silent; loudness normalisation skipped")
            return None
        return data

    # ---------------------------------------------------------------- master
    def overlay_filters(self):
        out = []
        W, H = self.W, self.H
        vertical = H > W
        for t in self.tl["titles"]:
            o = t["options"]
            fade = float(o.get("fade", 0.5))
            alpha = alpha_expr(t["start"], t["end"], min(fade, t["duration"] / 3))
            enable = f"between(t,{num(t['start'])},{num(t['end'])})"
            lines = [l for l in t["text"].split("\n") if l.strip()]
            scale = H / self.out["height"]
            short = min(W, H)
            main = float(o["size"]) * scale if o.get("size") else (0.045 if t["style"] == "lower_third" else 0.055) * short
            second = float(o["size2"]) * scale if o.get("size2") else main * 0.72
            max_w = W * (0.86 if t["style"] in ("lower_third", "top_left") else 0.9)
            sizes = [fit_font_size(l, s, max_w) for l, s in zip(lines, [main] + [second] * (len(lines) - 1))]
            gap = 1.55 if o.get("box", t["style"] == "lower_third") else 1.3
            heights = [s * gap for s in sizes]
            block = sum(heights)
            style = t["style"]
            if style == "lower_third":
                x = num(W * 0.06)
                y0 = H * (0.70 if vertical else 0.86) - block
            elif style == "top_left":
                x, y0 = num(W * 0.05), H * 0.06
            elif style == "top_center":
                x, y0 = "(w-text_w)/2", H * 0.07
            elif style == "bottom_center":
                x, y0 = "(w-text_w)/2", H * (0.72 if vertical else 0.86) - block
            else:
                x, y0 = "(w-text_w)/2", (H - block) / 2
            y = y0
            for i, (line, size) in enumerate(zip(lines, sizes)):
                out.append(self.drawtext(f"{V.slugify(t['id'])}_{i}", line, size, x, num(y),
                                         o.get("color", "white"), alpha, o.get("font"),
                                         box=bool(o.get("box", style == "lower_third")),
                                         box_color=o.get("box_color", "black"),
                                         box_opacity=float(o.get("box_opacity", 0.45)), enable=enable))
                y += heights[i]
        return out

    def caption_filter(self, cap_rel):
        st = self.tl["captions"].get("style") or {}
        vertical = self.H > self.W
        style = {"FontName": st.get("font", "Sans"), "FontSize": st.get("size", 10 if vertical else 14),
                 "PrimaryColour": st.get("primary", "&H00FFFFFF"), "OutlineColour": st.get("outline", "&H00000000"),
                 "BackColour": st.get("back", "&H80000000"), "BorderStyle": st.get("border_style", 1),
                 "Outline": st.get("outline_width", 1.2), "Shadow": st.get("shadow", 0.6),
                 "Bold": st.get("bold", 1 if vertical else 0), "Alignment": st.get("alignment", 2),
                 "MarginV": st.get("margin_v", 70 if vertical else 18), "MarginL": st.get("margin_l", 20),
                 "MarginR": st.get("margin_r", 20)}
        fs = ",".join(f"{k}={v}" for k, v in style.items())
        return f"subtitles={cap_rel}:force_style={q(fs)}"

    def codec_args(self):
        o = self.out
        vc = o.get("video_codec", "libx264")
        if self.preview:
            args = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p"]
        elif vc == "libx264":
            args = ["-c:v", "libx264", "-preset", str(o.get("x264_preset", "slow")), "-crf", str(o.get("crf", 18)),
                    "-pix_fmt", o.get("pix_fmt", "yuv420p"), "-profile:v", "high"]
        elif vc == "libx265":
            args = ["-c:v", "libx265", "-preset", str(o.get("x264_preset", "slow")), "-crf", str(o.get("crf", 20)),
                    "-pix_fmt", o.get("pix_fmt", "yuv420p"), "-tag:v", "hvc1"]
        elif vc == "prores_ks":
            args = ["-c:v", "prores_ks", "-profile:v", str(o.get("prores_profile", 3)), "-vendor", "apl0",
                    "-pix_fmt", o.get("pix_fmt", "yuv422p10le")]
        elif vc == "libvpx-vp9":
            args = ["-c:v", "libvpx-vp9", "-crf", str(o.get("crf", 31)), "-b:v", "0", "-row-mt", "1",
                    "-pix_fmt", o.get("pix_fmt", "yuv420p")]
        else:
            args = ["-c:v", vc, "-pix_fmt", o.get("pix_fmt", "yuv420p")]
        if not self.ten_bit or self.preview:
            args += ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]
        ac = o.get("audio_codec", "aac")
        if self.preview or ac == "aac":
            args += ["-c:a", "aac", "-b:a", "192k" if self.preview else str(o.get("audio_bitrate", "320k"))]
        elif ac == "libopus":
            args += ["-c:a", "libopus", "-b:a", str(o.get("audio_bitrate", "192k"))]
        else:
            args += ["-c:a", ac]
        args += ["-ar", str(o.get("sample_rate", 48000)), "-ac", "2"]
        return args

    def output_path(self):
        p = Path(self.args.output) if self.args.output else Path(self.out["path"])
        p = p if p.is_absolute() else self.base / p
        if self.preview:
            p = p.with_name(p.stem + "_preview.mp4")
        return p

    def master_cmd(self, seg_paths, premix_rel, loud, out_path):
        tl = self.tl
        inputs = []
        for p in seg_paths:
            inputs += ["-i", p]
        g = self.join_graph(tl["clips"], "v", lambda i: f"[{i}:v]", "[vj]")
        cur = "[vj]"
        ov = self.overlay_filters()
        if ov:
            g.append(f"{cur}{','.join(ov)}[vt]")
            cur = "[vt]"
        caps = tl["captions"]
        soft_idx = None
        cap_mode = caps.get("mode", "none") if caps.get("path") else "none"
        if cap_mode in ("burn", "soft"):
            cap_rel = (self.build_rel / "captions.srt").as_posix()
            if not self.args.dry_run:
                shutil.copyfile(caps["path"], self.base / cap_rel)
            if cap_mode == "burn":
                g.append(f"{cur}{self.caption_filter(cap_rel)}[vs]")
                cur = "[vs]"
        pix = "yuv420p" if self.preview else self.out.get("pix_fmt", "yuv420p")
        g.append(f"{cur}format={pix}[vout]")
        a_idx = len(seg_paths)
        inputs += ["-i", premix_rel]
        L = self.out.get("loudness")
        if loud and L:
            ln = (f"loudnorm=I={num(L['target_lufs'])}:TP={num(L['true_peak'])}:LRA={num(L.get('lra', 11))}:"
                  f"measured_I={loud['input_i']}:measured_TP={loud['input_tp']}:measured_LRA={loud['input_lra']}:"
                  f"measured_thresh={loud['input_thresh']}:offset={loud['target_offset']}:linear=true")
            g.append(f"[{a_idx}:a]{ln},aresample=48000[aout]")
        else:
            g.append(f"[{a_idx}:a]alimiter=limit=0.891:level=false,aresample=48000[aout]")
        if cap_mode == "soft":
            soft_idx = a_idx + 1
            inputs += ["-i", (self.build_rel / "captions.srt").as_posix()]
        cmd = inputs + ["-filter_complex", ";".join(g), "-map", "[vout]", "-map", "[aout]"]
        if soft_idx is not None:
            ext = out_path.suffix.lower()
            scodec = "mov_text" if ext in (".mp4", ".mov", ".m4v") else ("webvtt" if ext == ".webm" else "srt")
            cmd += ["-map", f"{soft_idx}:0", "-c:s", scodec, "-metadata:s:s:0", f"language={caps.get('language', 'eng')}"]
        cmd += self.codec_args()
        cmd += ["-r", V.fps_str(self.fps), "-t", num(tl["total_seconds"])]
        if out_path.suffix.lower() in (".mp4", ".mov", ".m4v"):
            cmd += ["-movflags", "+faststart"]
        cmd += ["-metadata", f"title={tl['title']}", V.rel_to(out_path, self.base)]
        return cmd

    # ------------------------------------------------------------------- run
    def run(self):
        tl = self.tl
        out_path = self.output_path()
        self.log(f"vid-assembly render [{self.mode}] {tl['title']!r}: {len(tl['clips'])} clips, "
                 f"{V.clock(tl['total_seconds'])} at {self.W}x{self.H} {V.fps_str(self.fps)} fps")
        if not self.args.dry_run:
            (self.build / "segments").mkdir(parents=True, exist_ok=True)
            out_path.parent.mkdir(parents=True, exist_ok=True)

        seg_paths, reused = [], 0
        for c in tl["clips"]:
            key = self.segment_key(c)
            rel = (self.build_rel / "segments" / f"{c['index']:03d}_{V.slugify(c['id'], 24)}_{key}.mkv").as_posix()
            seg_paths.append(rel)
            if not self.args.force and not self.args.dry_run and (self.base / rel).exists() and (self.base / rel).stat().st_size > 0:
                reused += 1
                continue
            self.log(f"  segment {c['index'] + 1}/{len(tl['clips'])}: {c['id']} ({c['type']}, {c['seconds']:.2f}s)")
            tmp = rel + ".part.mkv"
            self.ffmpeg(self.segment_cmd(c, tmp), "segment", c["id"])
            if not self.args.dry_run:
                (self.base / tmp).replace(self.base / rel)
        if reused:
            self.log(f"  reused {reused} cached segment(s)")

        premix_rel = (self.build_rel / "premix.wav").as_posix()
        self.log("  mixing audio (program, narration, music, sfx)")
        self.ffmpeg(self.mix_cmd(seg_paths, premix_rel), "mix")
        self.log("  measuring loudness")
        loud = self.measure_loudness(premix_rel)
        if loud:
            self.report["loudness_premix"] = loud
        self.log(f"  encoding {V.rel_to(out_path, self.base)}")
        tmp_out = out_path.with_name(out_path.stem + ".part" + out_path.suffix)
        cmd = self.master_cmd(seg_paths, premix_rel, loud, tmp_out)
        self.ffmpeg(cmd, "master")
        if self.args.dry_run:
            return out_path
        if not tmp_out.exists() or tmp_out.stat().st_size == 0:
            raise RuntimeError("FFmpeg reported success but the output file is missing or empty")
        tmp_out.replace(out_path)

        caps = tl["captions"]
        if caps.get("path") and caps.get("mode") != "none":
            lang = caps.get("language", "eng")
            side = out_path.with_name(f"{out_path.stem}.{lang}.srt")
            shutil.copyfile(caps["path"], side)
            try:
                import make_captions as MC
                MC.write_vtt(MC.read_cues(side), side.with_suffix(".vtt"))
            except Exception as exc:  # sidecar VTT is a convenience, never fatal
                self.report["warnings"].append(f"could not write VTT sidecar: {exc}")
        return out_path


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("timeline", help="path to timeline.json")
    ap.add_argument("--preview", action="store_true", help="fast low-resolution proxy render (adds _preview)")
    ap.add_argument("--preview-size", type=int, default=640, help="long edge of the preview in pixels")
    ap.add_argument("--output", help="override output path (relative to the timeline's folder)")
    ap.add_argument("--dry-run", action="store_true", help="resolve and print the plan; render nothing")
    ap.add_argument("--force", action="store_true", help="re-encode every segment (ignore the cache)")
    ap.add_argument("--no-qc", action="store_true", help="skip the automatic QC pass")
    ap.add_argument("--verbose", "-v", action="store_true", help="print FFmpeg commands")
    args = ap.parse_args(argv)

    try:
        tl = V.resolve_timeline(args.timeline)
    except V.TimelineError as exc:
        print(f"TIMELINE ERROR: {exc}\nNOT RENDERED: no output file was created.")
        return 2
    if tl["errors"]:
        print("Timeline has errors; fix them before rendering:")
        for e in tl["errors"]:
            print(f"  ERROR  {e}")
        print("NOT RENDERED: no output file was created.")
        return 2
    if not args.dry_run and not (V.which("ffmpeg") and V.which("ffprobe")):
        print("FFmpeg/ffprobe not found. Deliver the edit package (timeline, edit plan, captions) instead.\n"
              "NOT RENDERED: no output file was created.")
        return 3

    r = Renderer(tl, args)
    t0 = time.time()
    try:
        out_path = r.run()
    except (RuntimeError, V.TimelineError) as exc:
        r.report["error"] = str(exc)
        if not args.dry_run:
            r.build.mkdir(parents=True, exist_ok=True)
            (r.build / "render_report.json").write_text(json.dumps(r.report, indent=2, default=str))
        print(f"RENDER FAILED: {exc}\nNOT RENDERED: no finished output file was created "
              f"(see {r.build / 'render_report.json'}).")
        return 1
    r.report["seconds"] = round(time.time() - t0, 1)

    if args.dry_run:
        print(f"DRY RUN: {len(r.report['stages'])} FFmpeg steps planned, expected duration "
              f"{V.clock(tl['total_seconds'])}. NOT RENDERED: dry run creates no output file.")
        return 0

    r.report["output"] = str(out_path)
    r.report["rendered"] = True
    status = 0
    qc_summary = "QC skipped"
    if not args.no_qc:
        import qc_output as QC
        qc = QC.run_qc(out_path, expected=QC.expected_from_timeline(tl, preview=args.preview, size=(r.W, r.H)),
                       qc_dir=r.build / "qc")
        r.report["qc"] = {"status": qc["status"], "report": qc.get("report_path"),
                          "contact_sheet": qc.get("contact_sheet")}
        qc_summary = f"QC {qc['status']} ({len(qc['failures'])} failures, {len(qc['warnings'])} warnings)"
        if qc["status"] == "FAIL":
            status = 1
    (r.build / "render_report.json").write_text(json.dumps(r.report, indent=2, default=str))
    info = V.media_info(out_path)
    print(f"RENDERED: {out_path} | {V.clock(info.get('duration') or 0)} | {info.get('width')}x{info.get('height')} "
          f"@ {info.get('fps') and round(info['fps'], 3)} fps | {V.human_size(info['size_bytes'])} | {qc_summary} | "
          f"render time {r.report['seconds']}s")
    for w in r.report["warnings"]:
        print(f"  warning: {w}")
    return status


if __name__ == "__main__":
    sys.exit(main())
