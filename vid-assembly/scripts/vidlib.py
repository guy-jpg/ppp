"""Shared helpers for the vid-assembly scripts.

Everything that more than one script needs lives here: timeline loading and
normalisation, frame-accurate timing math, anchor resolution, ffprobe access,
presets and small formatting utilities. Only the Python standard library is
used so the scripts run anywhere Python 3.8+ and FFmpeg are installed.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
from fractions import Fraction
from pathlib import Path

SCHEMA = "vid-assembly/timeline@1"

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".mpg", ".mpeg", ".mxf",
             ".ogv", ".wmv", ".flv", ".ts", ".m2ts", ".dv", ".3gp"}
AUDIO_EXT = {".wav", ".mp3", ".aac", ".m4a", ".flac", ".ogg", ".oga", ".opus", ".aif",
             ".aiff", ".wma"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp", ".gif", ".jp2"}

# ---------------------------------------------------------------------------
# Delivery presets. Every key can be overridden in timeline["output"].
# ---------------------------------------------------------------------------
_H264 = dict(container="mp4", video_codec="libx264", crf=18, x264_preset="slow",
             pix_fmt="yuv420p", audio_codec="aac", audio_bitrate="320k", sample_rate=48000)
PRESETS = {
    "youtube-1080p": dict(_H264, width=1920, height=1080, fps="24", fit="pad",
                          loudness={"target_lufs": -14, "true_peak": -1.0, "lra": 11}),
    "youtube-4k": dict(_H264, width=3840, height=2160, fps="24", fit="pad", crf=17,
                       loudness={"target_lufs": -14, "true_peak": -1.0, "lra": 11}),
    "web-720p": dict(_H264, width=1280, height=720, fps="24", fit="pad", crf=21,
                     audio_bitrate="192k",
                     loudness={"target_lufs": -14, "true_peak": -1.0, "lra": 11}),
    "vertical-1080x1920": dict(_H264, width=1080, height=1920, fps="30", fit="blur",
                               loudness={"target_lufs": -14, "true_peak": -1.0, "lra": 11}),
    "square-1080": dict(_H264, width=1080, height=1080, fps="30", fit="blur",
                        loudness={"target_lufs": -14, "true_peak": -1.0, "lra": 11}),
    "broadcast-hd-ebu": dict(container="mov", video_codec="prores_ks", prores_profile=3,
                             pix_fmt="yuv422p10le", audio_codec="pcm_s24le", sample_rate=48000,
                             width=1920, height=1080, fps="25", fit="pad",
                             loudness={"target_lufs": -23, "true_peak": -1.0, "lra": 15}),
    "broadcast-hd-atsc": dict(container="mov", video_codec="prores_ks", prores_profile=3,
                              pix_fmt="yuv422p10le", audio_codec="pcm_s24le", sample_rate=48000,
                              width=1920, height=1080, fps="30000/1001", fit="pad",
                              loudness={"target_lufs": -24, "true_peak": -2.0, "lra": 15}),
    "prores-master": dict(container="mov", video_codec="prores_ks", prores_profile=3,
                          pix_fmt="yuv422p10le", audio_codec="pcm_s24le", sample_rate=48000,
                          width=1920, height=1080, fps="24", fit="pad",
                          loudness={"target_lufs": -16, "true_peak": -1.0, "lra": 15}),
}
DEFAULT_PRESET = "youtube-1080p"

# ---------------------------------------------------------------------------
# Transitions. Friendly editorial names map onto FFmpeg xfade transitions.
# ---------------------------------------------------------------------------
XFADE_NAMES = {
    "fade", "wipeleft", "wiperight", "wipeup", "wipedown", "slideleft", "slideright",
    "slideup", "slidedown", "circlecrop", "rectcrop", "distance", "fadeblack", "fadewhite",
    "radial", "smoothleft", "smoothright", "smoothup", "smoothdown", "circleopen",
    "circleclose", "vertopen", "vertclose", "horzopen", "horzclose", "dissolve", "pixelize",
    "diagtl", "diagtr", "diagbl", "diagbr", "hlslice", "hrslice", "vuslice", "vdslice",
    "hblur", "fadegrays", "wipetl", "wipetr", "wipebl", "wipebr", "squeezeh", "squeezev",
    "zoomin", "fadefast", "fadeslow",
}
FRIENDLY_TRANSITIONS = {
    "cut": None,
    "dissolve": "fade",            # a true cross-dissolve (xfade's own "dissolve" is a pixel noise effect)
    "crossfade": "fade",
    "cross_dissolve": "fade",
    "dip_to_black": "fadeblack",
    "dip_to_white": "fadewhite",
    "fade_through_black": "fadeblack",
    "wipe_left": "wipeleft",
    "wipe_right": "wiperight",
    "slide_left": "slideleft",
    "slide_right": "slideright",
    "push_left": "slideleft",
    "push_right": "slideright",
    "iris_open": "circleopen",
    "iris_close": "circleclose",
    "smooth_left": "smoothleft",
    "smooth_right": "smoothright",
    "blur_dissolve": "hblur",
    "zoom_in": "zoomin",
}
DEFAULT_TRANSITION_SECONDS = {"fade": 0.75, "fadeblack": 1.0, "fadewhite": 1.0}
DEFAULT_OTHER_TRANSITION_SECONDS = 0.5

GRADE_PRESETS = {
    "none": "",
    "bw": "hue=s=0",
    "bw_contrast": "hue=s=0,eq=contrast=1.15:brightness=-0.02",
    "warm": "colorbalance=rs=0.04:gs=0.01:bs=-0.05:rm=0.03:bm=-0.03",
    "cool": "colorbalance=rs=-0.04:bs=0.05:rm=-0.02:bm=0.03",
    "vintage": "curves=preset=vintage",
    "punch": "eq=contrast=1.08:saturation=1.12",
    "faded": "eq=contrast=0.92:saturation=0.85:brightness=0.02",
    "sepia": "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
    "denoise": "hqdn3d=2:1.5:3:3",
}


class TimelineError(Exception):
    """Raised for problems that make a timeline unusable."""


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------
_COMMON_FPS = {"23.976": "24000/1001", "23.98": "24000/1001", "29.97": "30000/1001",
               "59.94": "60000/1001", "47.952": "48000/1001", "119.88": "120000/1001"}


def parse_fps(value) -> Fraction:
    s = str(value).strip()
    s = _COMMON_FPS.get(s, s)
    try:
        fps = Fraction(s)
    except (ValueError, ZeroDivisionError) as exc:
        raise TimelineError(f"Invalid fps value: {value!r}") from exc
    if fps <= 0 or fps > 240:
        raise TimelineError(f"fps out of range: {value!r}")
    return fps


def fps_str(fps: Fraction) -> str:
    return str(fps.numerator) if fps.denominator == 1 else f"{fps.numerator}/{fps.denominator}"


def parse_time(value, fps: Fraction | None = None, field: str = "time") -> float | None:
    """Accept seconds (number or string), MM:SS(.ms), HH:MM:SS(.ms) or HH:MM:SS:FF."""
    if value is None:
        return None
    if isinstance(value, bool):
        raise TimelineError(f"{field}: expected a time, got a boolean")
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", ".")
    if re.fullmatch(r"-?\d+(\.\d+)?s?", s):
        return float(s.rstrip("s"))
    parts = s.split(":")
    try:
        if len(parts) == 4:
            if fps is None:
                raise TimelineError(f"{field}: frame timecode {value!r} needs an fps")
            h, m, sec, fr = (int(p) for p in parts)
            return h * 3600 + m * 60 + sec + fr / float(fps)
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
    except ValueError:
        pass
    raise TimelineError(f"{field}: unrecognised time value {value!r}")


def to_frames(seconds: float, fps: Fraction) -> int:
    return int(round(seconds * float(fps)))


def frames_to_seconds(frames: int, fps: Fraction) -> float:
    return float(Fraction(frames) / fps)


def timecode(seconds: float, fps: Fraction) -> str:
    """Non-drop-frame HH:MM:SS:FF, using the nominal (rounded) frame rate."""
    nominal = max(1, round(float(fps)))
    total = max(0, to_frames(seconds, fps))
    ff = total % nominal
    s_total = total // nominal
    return f"{s_total // 3600:02d}:{(s_total // 60) % 60:02d}:{s_total % 60:02d}:{ff:02d}"


def clock(seconds: float, ms: bool = True) -> str:
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}" if ms else f"{h:02d}:{m:02d}:{int(s):02d}"


def db_to_linear(db: float) -> float:
    return 10 ** (db / 20.0)


# ---------------------------------------------------------------------------
# Process / tool helpers
# ---------------------------------------------------------------------------
def which(name: str) -> str | None:
    return shutil.which(name)


def run(cmd, cwd=None, check=True, capture=True, timeout=None):
    """Run a command (list form, never through a shell)."""
    proc = subprocess.run(cmd, cwd=cwd, capture_output=capture, text=True,
                          timeout=timeout, errors="replace")
    if check and proc.returncode != 0:
        tail = "\n".join((proc.stderr or "").strip().splitlines()[-25:])
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(map(str, cmd[:6]))} ...\n{tail}")
    return proc


_PROBE_CACHE: dict = {}


def ffprobe(path) -> dict:
    """Return ffprobe's JSON (format + streams) for a file, cached per path+mtime."""
    p = Path(path)
    key = (str(p.resolve()), p.stat().st_mtime if p.exists() else None)
    if key in _PROBE_CACHE:
        return _PROBE_CACHE[key]
    if not which("ffprobe"):
        raise RuntimeError("ffprobe is not installed")
    proc = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format",
                "-show_streams", str(p)], check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe could not read {p}: {(proc.stderr or '').strip()[:300]}")
    data = json.loads(proc.stdout or "{}")
    _PROBE_CACHE[key] = data
    return data


def _ratio(value) -> float | None:
    try:
        if not value or value in ("0/0", "N/A"):
            return None
        return float(Fraction(value))
    except (ValueError, ZeroDivisionError):
        return None


def media_info(path) -> dict:
    """A compact, normalised summary of a media file."""
    p = Path(path)
    data = ffprobe(p)
    fmt = data.get("format", {})
    streams = data.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"
              and not s.get("disposition", {}).get("attached_pic")), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    ext = p.suffix.lower()
    kind = "image" if ext in IMAGE_EXT else ("audio" if v is None and a is not None else "video")
    if ext in AUDIO_EXT and a is not None:
        kind = "audio"
    dur = None
    for cand in (fmt.get("duration"), (v or {}).get("duration"), (a or {}).get("duration")):
        try:
            if cand not in (None, "N/A"):
                dur = float(cand)
                break
        except ValueError:
            continue
    if kind == "image":
        dur = None
    info = {"path": str(p), "kind": kind, "duration": dur, "size_bytes": int(fmt.get("size", 0) or 0),
            "format": fmt.get("format_name"), "has_audio": a is not None, "has_video": v is not None}
    if v is not None:
        w, h = v.get("width"), v.get("height")
        sar = v.get("sample_aspect_ratio") or "1:1"
        try:
            sn, sd = (int(x) for x in sar.split(":"))
            sar_f = sn / sd if sn and sd else 1.0
        except ValueError:
            sar_f = 1.0
        rotation = 0
        for sd_item in v.get("side_data_list", []) or []:
            if "rotation" in sd_item:
                rotation = int(sd_item["rotation"])
        rotation = int(v.get("tags", {}).get("rotate", rotation) or rotation)
        disp_w, disp_h = (w or 0) * sar_f, (h or 0)
        if abs(rotation) in (90, 270):
            disp_w, disp_h = disp_h, disp_w
        info.update({
            "width": w, "height": h, "sar": sar, "rotation": rotation,
            "display_aspect": round(disp_w / disp_h, 4) if disp_h else None,
            "codec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
            "fps": _ratio(v.get("avg_frame_rate")) or _ratio(v.get("r_frame_rate")),
            "r_frame_rate": v.get("r_frame_rate"), "avg_frame_rate": v.get("avg_frame_rate"),
            "field_order": v.get("field_order", "unknown"),
            "color_transfer": v.get("color_transfer"),
        })
    if a is not None:
        info.update({"audio_codec": a.get("codec_name"), "sample_rate": int(a.get("sample_rate", 0) or 0),
                     "channels": a.get("channels")})
    return info


def ffmpeg_has_filter(name: str) -> bool:
    if not which("ffmpeg"):
        return False
    proc = run(["ffmpeg", "-hide_banner", "-filters"], check=False)
    return re.search(rf"^\s*\S+\s+{re.escape(name)}\s", proc.stdout or "", re.M) is not None


def ffmpeg_has_encoder(name: str) -> bool:
    if not which("ffmpeg"):
        return False
    proc = run(["ffmpeg", "-hide_banner", "-encoders"], check=False)
    return re.search(rf"^\s*\S+\s+{re.escape(name)}\s", proc.stdout or "", re.M) is not None


def resolve_font(spec: str | None) -> str | None:
    """Turn a font family/pattern or a path into a font file path."""
    spec = spec or "Sans"
    if Path(spec).suffix.lower() in (".ttf", ".otf", ".ttc") and Path(spec).exists():
        return str(Path(spec).resolve())
    if which("fc-match"):
        proc = run(["fc-match", "-f", "%{file}", spec], check=False)
        if proc.returncode == 0 and proc.stdout and Path(proc.stdout.strip()).exists():
            return proc.stdout.strip()
    for cand in ("/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf",
                 "C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(cand).exists():
            return cand
    return None


def frame_sheet(video, times, out_path, cols: int = 4, scale: str = "scale=480:-2",
                labels=None) -> str | None:
    """Grab one frame per timestamp and tile them into a labelled contact sheet (JPEG)."""
    import tempfile
    video = Path(video).resolve()
    out_path = Path(out_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="vidsheet_") as td:
        tmp = Path(td)
        font = resolve_font("Sans")
        font_rel = None
        if font:
            shutil.copyfile(font, tmp / ("font" + Path(font).suffix))
            font_rel = "font" + Path(font).suffix
        made = 0
        for k, t in enumerate(times):
            vf = scale
            label = (labels[k] if labels else clock(t)) if font_rel else None
            if label:
                safe = re.sub(r"[^A-Za-z0-9 ._()#/-]", " ", label.replace(":", "."))
                (tmp / f"l{k:03d}.txt").write_text(safe, encoding="utf-8")
                vf += (f",drawtext=fontfile={font_rel}:textfile=l{k:03d}.txt:expansion=none:x=8:y=h-th-8:"
                       f"fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4")
            proc = run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", "-ss", f"{max(0.0, t):.3f}",
                        "-i", str(video), "-frames:v", "1", "-vf", vf, f"f{made:03d}.jpg"], cwd=tmp, check=False)
            if proc.returncode == 0 and (tmp / f"f{made:03d}.jpg").exists():
                made += 1
        if not made:
            return None
        cols = max(1, min(cols, made))
        rows = (made + cols - 1) // cols
        proc = run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", "-framerate", "1",
                    "-i", "f%03d.jpg", "-vf", f"tile={cols}x{rows}:padding=4:margin=4:color=0x202020",
                    "-frames:v", "1", str(out_path)], cwd=tmp, check=False)
    return str(out_path) if proc.returncode == 0 and out_path.exists() else None


def slugify(text: str, maxlen: int = 48) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")
    return (s[:maxlen].strip("-")) or "untitled"


def stable_hash(obj) -> str:
    return hashlib.sha1(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:10]


def file_signature(path) -> dict:
    p = Path(path)
    if not p.exists():
        return {"path": str(p), "missing": True}
    st = p.stat()
    return {"path": str(p.resolve()), "size": st.st_size, "mtime": int(st.st_mtime)}


# ---------------------------------------------------------------------------
# Timeline loading and resolution
# ---------------------------------------------------------------------------
def load_json(path) -> dict:
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        raise TimelineError(f"{path}: invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}") from exc


def build_output_settings(raw_out: dict | None, title: str) -> dict:
    raw_out = dict(raw_out or {})
    preset_name = raw_out.get("preset", DEFAULT_PRESET)
    if preset_name not in PRESETS:
        raise TimelineError(f"Unknown output preset {preset_name!r}. Known: {', '.join(PRESETS)}")
    out = json.loads(json.dumps(PRESETS[preset_name]))
    out["preset"] = preset_name
    for k, v in raw_out.items():
        if k == "loudness" and isinstance(v, dict) and isinstance(out.get("loudness"), dict):
            out["loudness"].update(v)
        else:
            out[k] = v
    out["fps"] = parse_fps(out["fps"])
    out["width"], out["height"] = int(out["width"]), int(out["height"])
    if out["width"] % 2 or out["height"] % 2:
        raise TimelineError("output width and height must be even numbers")
    out.setdefault("background", "black")
    if not out.get("path"):
        out["path"] = f"exports/{slugify(title)}_v1.{out.get('container', 'mp4')}"
    return out


def _normalise_transition(raw, fps, warnings, where):
    if raw in (None, "", "cut"):
        return {"type": "cut", "xfade": None, "duration": 0.0, "frames": 0}
    if isinstance(raw, str):
        raw = {"type": raw}
    ttype = str(raw.get("type", "cut")).lower()
    if ttype in FRIENDLY_TRANSITIONS:
        xf = FRIENDLY_TRANSITIONS[ttype]
    elif ttype in XFADE_NAMES:
        xf = ttype
    else:
        raise TimelineError(f"{where}: unknown transition type {ttype!r}")
    if xf is None:
        return {"type": "cut", "xfade": None, "duration": 0.0, "frames": 0}
    dur = parse_time(raw.get("duration"), fps, f"{where}.transition.duration")
    if dur is None:
        dur = DEFAULT_TRANSITION_SECONDS.get(xf, DEFAULT_OTHER_TRANSITION_SECONDS)
    frames = to_frames(dur, fps)
    if frames <= 0:
        warnings.append(f"{where}: transition shorter than one frame, treated as a cut")
        return {"type": "cut", "xfade": None, "duration": 0.0, "frames": 0}
    return {"type": ttype, "xfade": xf, "duration": frames_to_seconds(frames, fps), "frames": frames}


def _infer_type(c: dict) -> str:
    if c.get("type"):
        return str(c["type"]).lower()
    src = c.get("source")
    if src:
        ext = Path(src).suffix.lower()
        return "image" if ext in IMAGE_EXT else "video"
    return "title" if c.get("text") else "color"


def resolve_timeline(path, probe: bool = True) -> dict:
    """Load a timeline JSON, normalise every field and compute program timing.

    Returns a dict with: base_dir, title, output, clips, narration, music, sfx,
    titles, captions, mix, total_frames, total_seconds, errors, warnings.
    Problems are collected rather than raised where possible so validation can
    report them all at once.
    """
    path = Path(path)
    raw = load_json(path)
    base = path.parent.resolve()
    errors: list[str] = []
    warnings: list[str] = []
    if raw.get("schema") not in (None, SCHEMA):
        warnings.append(f"schema is {raw.get('schema')!r}; this tool understands {SCHEMA!r}")
    title = raw.get("title") or path.stem
    out = build_output_settings(raw.get("output"), title)
    fps = out["fps"]

    def rel(p):
        if p is None:
            return None
        q = Path(p)
        return q if q.is_absolute() else (base / q)

    clips = []
    ids = set()
    raw_clips = raw.get("clips") or []
    if not raw_clips:
        errors.append("timeline has no clips")
    for i, rc in enumerate(raw_clips):
        if not isinstance(rc, dict):
            errors.append(f"clips[{i}] is not an object")
            continue
        c = dict(rc)
        cid = str(c.get("id") or f"C{i + 1:03d}")
        where = f"clip {cid}"
        if cid in ids:
            errors.append(f"{where}: duplicate clip id")
        ids.add(cid)
        ctype = _infer_type(c)
        if ctype not in ("video", "image", "color", "title"):
            errors.append(f"{where}: unknown clip type {ctype!r}")
            continue
        try:
            speed = float(c.get("speed", 1.0))
            if speed <= 0 or speed > 16:
                raise TimelineError(f"{where}: speed must be between 0 and 16")
            src = rel(c.get("source"))
            info = None
            if ctype in ("video", "image"):
                if not src:
                    raise TimelineError(f"{where}: a {ctype} clip needs a 'source'")
                if not src.exists():
                    errors.append(f"{where}: source not found: {src}")
                elif probe:
                    try:
                        info = media_info(src)
                    except RuntimeError as exc:
                        errors.append(f"{where}: {exc}")
            in_s = out_s = None
            freeze = bool(c.get("freeze", False))
            if ctype == "video" and freeze:
                # A freeze frame: hold the frame at `in` (supports motion like a still).
                in_s = parse_time(c.get("in", 0), fps, f"{where}.in") or 0.0
                out_s = in_s + 1.0 / float(fps)
                src_len = info.get("duration") if info else None
                if src_len is not None and in_s >= src_len:
                    errors.append(f"{where}: freeze point {in_s:.3f}s is past the end of the source")
                seconds = parse_time(c.get("duration", 3.0), fps, f"{where}.duration")
            elif ctype == "video":
                in_s = parse_time(c.get("in", 0), fps, f"{where}.in") or 0.0
                out_s = parse_time(c.get("out"), fps, f"{where}.out")
                dur_override = parse_time(c.get("duration"), fps, f"{where}.duration")
                src_len = info.get("duration") if info else None
                if out_s is None and dur_override is not None:
                    out_s = in_s + dur_override * speed
                if out_s is None:
                    if src_len is None:
                        raise TimelineError(f"{where}: needs 'out' or 'duration' (source length unknown)")
                    out_s = src_len
                if out_s <= in_s:
                    raise TimelineError(f"{where}: out ({out_s}) must be after in ({in_s})")
                if src_len is not None and out_s > src_len + 0.05:
                    errors.append(f"{where}: out point {out_s:.3f}s is past the end of the source ({src_len:.3f}s)")
                if info and not info.get("has_video"):
                    errors.append(f"{where}: source has no video stream")
                seconds = dur_override if dur_override is not None else (out_s - in_s) / speed
            else:
                default = 5.0 if ctype == "image" else 3.0
                seconds = parse_time(c.get("duration", default), fps, f"{where}.duration")
            frames = to_frames(seconds, fps)
            if frames < 1:
                raise TimelineError(f"{where}: duration is shorter than one frame")
            fit = c.get("fit")
            if fit is None:
                fit = out.get("fit", "pad")
                is_still = ctype == "image" or (ctype == "video" and freeze)
                aspect = (info or {}).get("display_aspect")
                if is_still and fit == "pad" and aspect and c.get("motion") != "none":
                    # Bars sliding through a Ken Burns move look broken: crop small aspect
                    # differences, use a blurred fill for large ones (e.g. portraits in 16:9).
                    target = out["width"] / out["height"]
                    fit = "crop" if abs(aspect - target) / target <= 0.20 else "blur"
            if fit not in ("pad", "crop", "blur"):
                raise TimelineError(f"{where}: fit must be pad, crop or blur (never stretch)")
            grade = c.get("grade", "none")
            if grade not in GRADE_PRESETS:
                raise TimelineError(f"{where}: unknown grade {grade!r}; known: {', '.join(GRADE_PRESETS)}")
            transition = _normalise_transition(c.get("transition"), fps, warnings, where)
            clip = {
                "index": len(clips), "id": cid, "scene": c.get("scene"), "type": ctype,
                "source": str(src) if src else None, "source_rel": c.get("source"),
                "in": in_s, "out": out_s, "speed": speed, "frames": frames, "freeze": freeze,
                "seconds": frames_to_seconds(frames, fps), "fit": fit, "grade": grade,
                "vf": c.get("vf"), "motion": c.get("motion"), "deinterlace": c.get("deinterlace", "auto"),
                "audio": bool(c.get("audio", ctype == "video")),
                "audio_gain_db": float(c.get("audio_gain_db", 0.0)),
                "fade_in": parse_time(c.get("fade_in"), fps, f"{where}.fade_in") or 0.0,
                "fade_out": parse_time(c.get("fade_out"), fps, f"{where}.fade_out") or 0.0,
                "transition": transition, "text": c.get("text"), "subtext": c.get("subtext"),
                "color": c.get("color", out.get("background", "black")), "style": c.get("style") or {},
                "label": c.get("label"), "description": c.get("description"), "note": c.get("note"),
                "asset_id": c.get("asset_id"), "info": info,
            }
            if ctype == "image" and info and info.get("kind") not in ("image", "video"):
                errors.append(f"{where}: source does not look like an image")
            clips.append(clip)
        except TimelineError as exc:
            errors.append(str(exc))

    # First clip cannot transition from nothing: treat it as a fade from black.
    if clips and clips[0]["transition"]["frames"]:
        t = clips[0]["transition"]
        clips[0]["fade_in"] = max(clips[0]["fade_in"], t["duration"])
        warnings.append(f"clip {clips[0]['id']}: transition on the first clip treated as a "
                        f"{t['duration']:.2f}s fade from black")
        clips[0]["transition"] = {"type": "cut", "xfade": None, "duration": 0.0, "frames": 0}

    # Program positions (frame accurate). A transition overlaps the clip with its predecessor.
    pos = 0
    for i, c in enumerate(clips):
        t = c["transition"]
        if i > 0 and t["frames"]:
            prev = clips[i - 1]
            limit = min(prev["frames"], c["frames"]) - 1
            if t["frames"] > limit:
                errors.append(f"clip {c['id']}: {t['duration']:.2f}s transition is too long for the "
                              f"adjacent clips ({prev['seconds']:.2f}s and {c['seconds']:.2f}s)")
            pos -= t["frames"]
        c["start_frame"] = pos
        c["end_frame"] = pos + c["frames"]
        c["start"] = frames_to_seconds(c["start_frame"], fps)
        c["end"] = frames_to_seconds(c["end_frame"], fps)
        pos = c["end_frame"]
    for i, c in enumerate(clips):
        nxt = clips[i + 1]["transition"]["frames"] if i + 1 < len(clips) else 0
        if c["transition"]["frames"] + nxt > c["frames"]:
            errors.append(f"clip {c['id']}: its incoming and outgoing transitions overlap; lengthen the clip")
        for fade_key in ("fade_in", "fade_out"):
            if c[fade_key] > c["seconds"]:
                errors.append(f"clip {c['id']}: {fade_key} is longer than the clip")
    total_frames = pos
    total_seconds = frames_to_seconds(total_frames, fps)

    by_id = {c["id"]: c for c in clips}
    scene_start = {}
    for c in clips:
        if c.get("scene") and c["scene"] not in scene_start:
            scene_start[c["scene"]] = c["start"]

    def anchor_start(item, where):
        offset = parse_time(item.get("offset", 0), fps, f"{where}.offset") or 0.0
        if item.get("at_clip") is not None:
            ref = by_id.get(str(item["at_clip"]))
            if ref is None:
                raise TimelineError(f"{where}: at_clip {item['at_clip']!r} does not match any clip id")
            return ref["start"] + offset
        if item.get("at_scene") is not None:
            if item["at_scene"] not in scene_start:
                raise TimelineError(f"{where}: at_scene {item['at_scene']!r} does not match any scene")
            return scene_start[item["at_scene"]] + offset
        start = parse_time(item.get("start", 0), fps, f"{where}.start")
        return (start or 0.0) + offset

    def audio_items(key, default_gain):
        items = []
        for i, ri in enumerate(raw.get(key) or []):
            where = f"{key}[{i}]"
            try:
                it = dict(ri)
                iid = str(it.get("id") or f"{key[:3].upper()}{i + 1:02d}")
                where = f"{key} {iid}"
                src = rel(it.get("source"))
                if not src:
                    raise TimelineError(f"{where}: needs a 'source'")
                info = None
                if not src.exists():
                    errors.append(f"{where}: source not found: {src}")
                elif probe:
                    try:
                        info = media_info(src)
                        if not info.get("has_audio"):
                            errors.append(f"{where}: source has no audio stream")
                    except RuntimeError as exc:
                        errors.append(f"{where}: {exc}")
                start = anchor_start(it, where)
                src_in = parse_time(it.get("in", 0), fps, f"{where}.in") or 0.0
                src_out = parse_time(it.get("out"), fps, f"{where}.out")
                loop = bool(it.get("loop", False))
                src_len = info.get("duration") if info else None
                avail = None
                if src_out is not None:
                    avail = src_out - src_in
                elif src_len is not None and not loop:
                    avail = src_len - src_in
                dur = parse_time(it.get("duration"), fps, f"{where}.duration")
                end_abs = parse_time(it.get("end"), fps, f"{where}.end")
                if end_abs is not None:
                    dur = end_abs - start
                if it.get("until_end"):
                    dur = total_seconds - start
                if dur is None:
                    dur = avail if avail is not None else max(0.0, total_seconds - start)
                elif avail is not None and dur > avail + 0.01 and not loop:
                    warnings.append(f"{where}: requested {dur:.2f}s but the source only has {avail:.2f}s; trimmed")
                    dur = avail
                if start < 0:
                    raise TimelineError(f"{where}: starts before the program ({start:.2f}s)")
                if start >= total_seconds:
                    warnings.append(f"{where}: starts after the program ends; it will be silent")
                if start + dur > total_seconds + 0.01:
                    if key == "narration":
                        warnings.append(f"{where}: runs {start + dur - total_seconds:.2f}s past the end of the program and will be cut")
                    dur = max(0.0, total_seconds - start)
                if dur <= 0:
                    raise TimelineError(f"{where}: has no duration on the program")
                items.append({
                    "id": iid, "source": str(src), "source_rel": it.get("source"), "start": start,
                    "duration": dur, "end": start + dur, "in": src_in, "loop": loop,
                    "gain_db": float(it.get("gain_db", default_gain)),
                    "fade_in": parse_time(it.get("fade_in", 0), fps, f"{where}.fade_in") or 0.0,
                    "fade_out": parse_time(it.get("fade_out", 0), fps, f"{where}.fade_out") or 0.0,
                    "duck": bool(it.get("duck", True)), "text": it.get("text"),
                    "asset_id": it.get("asset_id"), "note": it.get("note"), "info": info,
                })
            except TimelineError as exc:
                errors.append(str(exc))
        return items

    # Narration and music are loudness-normalised to mix.reference_lufs before these gains
    # apply (see render.py), so gain_db is relative to the narration level.
    narration = audio_items("narration", 0.0)
    music = audio_items("music", -6.0)
    sfx = audio_items("sfx", -6.0)

    titles = []
    for i, rt in enumerate(raw.get("titles") or []):
        where = f"titles[{i}]"
        try:
            t = dict(rt)
            if not t.get("text"):
                raise TimelineError(f"{where}: needs 'text'")
            start = anchor_start(t, where)
            dur = parse_time(t.get("duration", 4.0), fps, f"{where}.duration")
            if start + dur > total_seconds + 0.01:
                warnings.append(f"{where}: runs past the end of the program; shortened")
                dur = max(0.1, total_seconds - start)
            style = t.get("style", "lower_third")
            if style not in ("lower_third", "center", "top_left", "top_center", "bottom_center"):
                raise TimelineError(f"{where}: unknown style {style!r}")
            titles.append({"id": t.get("id") or f"T{i + 1:02d}", "text": str(t["text"]), "start": start,
                           "duration": dur, "end": start + dur, "style": style,
                           "options": {k: v for k, v in t.items() if k not in ("text", "start", "duration",
                                                                               "style", "at_clip", "at_scene",
                                                                               "offset", "id")}})
        except TimelineError as exc:
            errors.append(str(exc))

    captions = dict(raw.get("captions") or {})
    if captions.get("file"):
        cp = rel(captions["file"])
        captions["path"] = str(cp)
        if not cp.exists():
            errors.append(f"captions file not found: {cp}")
        captions.setdefault("mode", "sidecar")
        if captions["mode"] not in ("burn", "soft", "sidecar", "none"):
            errors.append("captions.mode must be burn, soft, sidecar or none")
        captions.setdefault("language", "eng")

    mix = {"normalize_sources": True, "reference_lufs": -18.0,
           "ducking": {"enabled": True, "targets": ["music", "program"], "amount_db": 10.0,
                       "attack": 20, "release": 500},
           "bus_gain_db": {"program": 0.0, "narration": 0.0, "music": 0.0, "sfx": 0.0}}
    for k, v in (raw.get("mix") or {}).items():
        if isinstance(v, dict) and isinstance(mix.get(k), dict):
            mix[k].update(v)
        else:
            mix[k] = v

    return {"path": str(path), "base_dir": str(base), "title": title, "output": out, "clips": clips,
            "narration": narration, "music": music, "sfx": sfx, "titles": titles,
            "captions": captions, "mix": mix, "total_frames": total_frames,
            "total_seconds": total_seconds, "errors": errors, "warnings": warnings,
            "raw": raw}


# ---------------------------------------------------------------------------
# Asset (rights) log
# ---------------------------------------------------------------------------
ASSET_LOG_FIELDS = ["asset_id", "file", "title", "kind", "source_archive", "source_url", "creator",
                    "date", "license", "license_url", "pd_basis", "attribution", "restrictions",
                    "retrieved", "status", "notes"]


def read_asset_log(path) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    with open(p, newline="", encoding="utf-8") as fh:
        return [dict(r) for r in csv.DictReader(fh)]


def append_asset_log(path, row: dict) -> None:
    p = Path(path)
    new = not p.exists() or p.stat().st_size == 0
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=ASSET_LOG_FIELDS, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerow({k: row.get(k, "") for k in ASSET_LOG_FIELDS})


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} GB"


def is_finite(x) -> bool:
    try:
        return math.isfinite(float(x))
    except (TypeError, ValueError):
        return False


def project_dir_for(timeline_path) -> Path:
    return Path(timeline_path).resolve().parent


def rel_to(path, base) -> str:
    try:
        return os.path.relpath(path, base)
    except ValueError:
        return str(path)
