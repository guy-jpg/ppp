#!/usr/bin/env python3
"""Inventory media files and flag technical problems before editing.

For every video, audio and image file found it records duration, resolution,
display aspect, frame rate, codecs, audio layout and interlacing, then flags
issues that affect the edit (interlaced or variable-frame-rate video, low
resolution for the target, silent-era frame rates, HDR, rotation, no audio).

Optional:
  --thumbs DIR   a 3-frame strip per video (10/50/90 %) for quick visual review
  --scenes       shot-boundary detection; writes each shot's in/out and a
                 contact sheet of shot mid-frames (ideal for logging long reels)

Usage:
  python probe_media.py media/ --target 1920x1080 --out research/media_inventory.json \
      --md research/media_inventory.md --thumbs research/thumbs --scenes
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

ALL_EXT = V.VIDEO_EXT | V.AUDIO_EXT | V.IMAGE_EXT


def find_media(paths):
    for p in paths:
        p = Path(p)
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file() and f.suffix.lower() in ALL_EXT and "build" not in f.parts:
                    yield f
        elif p.is_file():
            yield p


def assess(info: dict, target_w: int, target_h: int) -> list[str]:
    notes = []
    kind = info["kind"]
    if kind in ("video", "image") and info.get("height"):
        w, h = info.get("width") or 0, info.get("height") or 0
        if info.get("display_aspect") and target_h:
            ta = target_w / target_h
            da = info["display_aspect"]
            if abs(da - ta) / ta > 0.03:
                shape = "pillarbox" if da < ta else "letterbox"
                if kind == "image":
                    how = "crop" if abs(da - ta) / ta <= 0.20 else "blurred fill"
                    notes.append(f"aspect {da:.3f} vs target {ta:.3f}: stills with motion default to {how} "
                                 "(set fit explicitly to override)")
                elif ta <= 1.0 < da:
                    notes.append(f"aspect {da:.3f} vs target {ta:.3f}: landscape in a vertical/square frame; "
                                 "the vertical and square presets use fit=blur (blurred fill); fit=crop with a "
                                 "motion focus fills the frame when the subject allows")
                else:
                    notes.append(f"aspect {da:.3f} vs target {ta:.3f}: will {shape} with fit=pad "
                                 "(never stretch; crop only if nothing important is lost)")
        short_src, short_tgt = min(w, h), min(target_w, target_h)
        if short_src and short_tgt and short_src < 0.66 * short_tgt:
            notes.append(f"low resolution ({w}x{h}): upscaled x{short_tgt / short_src:.1f}; expect softness. "
                         "Keep it short, or frame it inside a border rather than full screen")
    if kind == "video":
        if info.get("field_order") in ("tt", "bb", "tb", "bt"):
            notes.append("interlaced: the renderer deinterlaces automatically (bwdif)")
        r, a = info.get("r_frame_rate"), info.get("avg_frame_rate")
        try:
            rf, af = V._ratio(r), V._ratio(a)
            if rf and af and abs(rf - af) / rf > 0.01:
                notes.append(f"variable frame rate (r={r}, avg={a}): typical of phone/screen recordings; check sync")
        except (TypeError, ZeroDivisionError):
            pass
        fps = info.get("fps") or 0
        if 0 < fps < 20:
            notes.append(f"{fps:.2f} fps: possibly silent-era footage. If it already plays too fast, try "
                         "speed 0.75-0.85 for natural motion")
        if str(info.get("color_transfer")) in ("smpte2084", "arib-std-b67"):
            notes.append("HDR source (PQ/HLG): add a tone-mapping filter in `vf` or colours will look washed out")
        if info.get("rotation"):
            notes.append(f"rotation metadata {info['rotation']} deg (FFmpeg auto-rotates)")
        if not info.get("has_audio"):
            notes.append("no audio stream (silent footage)")
        if (info.get("duration") or 0) > 600:
            notes.append("long reel: run with --scenes to log shots before choosing in/out points")
    if kind == "audio":
        sr = info.get("sample_rate") or 0
        if sr and sr < 44100:
            notes.append(f"{sr} Hz sample rate: low fidelity; fine for archival actuality, weak for music")
        if info.get("audio_codec") in ("mp3", "aac", "vorbis", "opus") and (info.get("duration") or 0) > 0:
            notes.append("lossy audio: acceptable, but prefer WAV/FLAC masters when available")
    return notes


def detect_shots(path: Path, threshold: float, duration: float):
    proc = V.run(["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-i", str(path), "-an", "-vf",
                  f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-"], check=False)
    cuts = sorted({round(float(t), 3) for t in re.findall(r"pts_time:([\d.]+)", proc.stderr or "")})
    bounds = [0.0] + [c for c in cuts if 0.2 < c < duration - 0.2] + [duration]
    return [{"shot": i + 1, "in": round(a, 3), "out": round(b, 3), "duration": round(b - a, 3)}
            for i, (a, b) in enumerate(zip(bounds, bounds[1:])) if b - a > 0.04]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--target", default="1920x1080", help="delivery raster, e.g. 1920x1080 or 1080x1920")
    ap.add_argument("--out", help="write the inventory as JSON")
    ap.add_argument("--md", help="write the inventory as a Markdown table")
    ap.add_argument("--thumbs", help="directory for per-video thumbnail strips")
    ap.add_argument("--scenes", action="store_true", help="detect shot boundaries in each video")
    ap.add_argument("--scene-threshold", type=float, default=0.35, help="0.2 (sensitive) .. 0.5 (strict)")
    args = ap.parse_args(argv)
    if not V.which("ffprobe"):
        print("ffprobe not found: install FFmpeg to inspect media.")
        return 3
    tw, th = (int(x) for x in args.target.lower().split("x"))
    items = []
    for f in find_media(args.paths):
        try:
            info = V.media_info(f)
        except RuntimeError as exc:
            items.append({"path": str(f), "kind": "unreadable", "notes": [str(exc)[:200]]})
            continue
        info["notes"] = assess(info, tw, th)
        if args.thumbs and info["kind"] == "video" and info.get("duration"):
            d = info["duration"]
            out = Path(args.thumbs) / f"{f.stem}.jpg"
            info["thumbs"] = V.frame_sheet(f, [d * 0.1, d * 0.5, d * 0.9], out, cols=3, scale="scale=320:-2")
        if args.scenes and info["kind"] == "video" and info.get("duration"):
            shots = detect_shots(f, args.scene_threshold, info["duration"])
            info["shots"] = shots
            if args.thumbs and shots:
                shown = shots[:60]
                times = [(s["in"] + s["out"]) / 2 for s in shown]
                labels = [f"#{s['shot']} {V.clock(s['in'])}" for s in shown]
                info["shot_sheet"] = V.frame_sheet(f, times, Path(args.thumbs) / f"{f.stem}_shots.jpg",
                                                   cols=5, scale="scale=320:-2", labels=labels)
        items.append(info)

    for it in items:
        dims = f"{it.get('width')}x{it.get('height')}" if it.get("width") else "-"
        fps = f"{it['fps']:.3f}".rstrip("0").rstrip(".") if it.get("fps") and it["kind"] == "video" else "-"
        dur = V.clock(it["duration"]) if it.get("duration") else "-"
        print(f"{it['kind']:<6} {dur:>12}  {dims:>10}  {fps:>7} fps  {Path(it['path']).name}")
        for n in it.get("notes", []):
            print(f"         - {n}")
        if it.get("shots"):
            n = len(it["shots"])
            print(f"         - {n} shot{'s' if n != 1 else ''} detected")
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(items, indent=2, default=str), encoding="utf-8")
        print(f"Inventory JSON: {args.out}")
    if args.md:
        rows = ["| File | Kind | Duration | Size | FPS | Audio | Notes |", "|---|---|---|---|---|---|---|"]
        for it in items:
            rows.append("| {} | {} | {} | {} | {} | {} | {} |".format(
                Path(it["path"]).name, it["kind"], V.clock(it["duration"]) if it.get("duration") else "-",
                f"{it.get('width')}x{it.get('height')}" if it.get("width") else "-",
                round(it["fps"], 3) if it.get("fps") and it["kind"] == "video" else "-",
                f"{it.get('audio_codec')} {it.get('channels')}ch" if it.get("has_audio") else "none",
                "<br>".join(it.get("notes", [])) or ""))
        Path(args.md).parent.mkdir(parents=True, exist_ok=True)
        Path(args.md).write_text("# Media inventory\n\n" + "\n".join(rows) + "\n", encoding="utf-8")
        print(f"Inventory table: {args.md}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
