#!/usr/bin/env python3
"""Quality-check a rendered video file and prove that it exists.

Checks (written to <qc_dir>/qc_report.json):
  * the file exists, is non-empty and decodes end to end without errors
  * video/audio streams, resolution, frame rate and duration match expectations
  * integrated loudness and true peak are within tolerance of the target
  * unexpected black frames (>= 1 s) and dead air (>= 2 s of silence)
  * soft caption track present when one was requested
It also writes a timestamped contact sheet (contact_sheet.jpg) so the edit can
be reviewed visually without watching the whole file.

Usage:
  python qc_output.py exports/film_v1.mp4 --timeline timeline.json
  python qc_output.py some_video.mp4            # generic checks only
Exit status: 0 PASS/WARN, 1 FAIL.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402


def expected_from_timeline(tl: dict, preview: bool = False, size=None) -> dict:
    out = tl["output"]
    w, h = size if size else (out["width"], out["height"])
    black = [(c["start"], c["end"]) for c in tl["clips"] if c["type"] in ("title", "color")]
    for c in tl["clips"]:
        if c["fade_in"]:
            black.append((c["start"], c["start"] + c["fade_in"] + 0.5))
        if c["fade_out"]:
            black.append((c["end"] - c["fade_out"] - 0.5, c["end"]))
        if c["transition"]["xfade"] in ("fadeblack",):
            black.append((c["start"], c["start"] + c["transition"]["duration"]))
    return {"duration": tl["total_seconds"], "width": w, "height": h, "fps": float(out["fps"]),
            "audio": True, "loudness": None if preview else out.get("loudness"),
            "soft_captions": tl["captions"].get("mode") == "soft" and bool(tl["captions"].get("path")),
            "expected_black": black}


def _overlap(a, b):
    return max(0.0, min(a[1], b[1]) - max(a[0], b[0]))


def analyse_stream(path: Path, want_loudness: bool):
    """One decode pass: errors, black frames, silence and loudness."""
    af = "silencedetect=n=-50dB:d=2"
    if want_loudness:
        af += ",loudnorm=print_format=json"
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-i", str(path),
           "-vf", "blackdetect=d=1.0:pix_th=0.10", "-af", af, "-f", "null", "-"]
    proc = V.run(cmd, check=False)
    err = proc.stderr or ""
    blacks = [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", err)]
    silences, open_start = [], None
    for line in err.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            open_start = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and open_start is not None:
            silences.append((open_start, float(m.group(1))))
            open_start = None
    if open_start is not None:
        silences.append((open_start, None))
    loud = None
    if want_loudness and "{" in err:
        try:
            loud = json.loads(err[err.rfind("{"): err.rfind("}") + 1])
        except json.JSONDecodeError:
            loud = None
    decode_errors = [l for l in err.splitlines()
                     if re.search(r"(error while decoding|corrupt|invalid data found|non-existing pps|missing picture)", l, re.I)]
    return {"returncode": proc.returncode, "blacks": blacks, "silences": silences, "loudness": loud,
            "decode_errors": decode_errors[:20]}


def contact_sheet(path: Path, duration: float, qc_dir: Path, frames: int = 12, vertical=False):
    times = [duration * (k + 0.5) / frames for k in range(frames)]
    return V.frame_sheet(path, times, Path(qc_dir) / "contact_sheet.jpg", cols=6 if vertical else 4,
                         scale="scale=-2:420" if vertical else "scale=480:-2")


def run_qc(path, expected: dict | None = None, qc_dir=None, frames: int = 12, decode: bool = True) -> dict:
    path = Path(path)
    expected = expected or {}
    qc_dir = Path(qc_dir) if qc_dir else path.with_name(path.stem + "_qc")
    failures, warnings, checks = [], [], {}
    result = {"file": str(path), "status": "FAIL", "failures": failures, "warnings": warnings, "checks": checks}

    if not path.exists():
        failures.append("output file does not exist")
        return _finish(result, qc_dir)
    size = path.stat().st_size
    checks["size_bytes"] = size
    if size == 0:
        failures.append("output file is empty")
        return _finish(result, qc_dir)
    try:
        info = V.media_info(path)
        streams = V.ffprobe(path).get("streams", [])
    except RuntimeError as exc:
        failures.append(f"ffprobe cannot read the file: {exc}")
        return _finish(result, qc_dir)
    result["probe"] = {k: info.get(k) for k in ("duration", "width", "height", "fps", "codec", "pix_fmt",
                                                "audio_codec", "sample_rate", "channels", "format")}
    if not info.get("has_video"):
        failures.append("no video stream")
    if expected.get("audio", True) and not info.get("has_audio"):
        failures.append("no audio stream")
    dur = info.get("duration") or 0.0
    if expected.get("duration") is not None:
        exp = float(expected["duration"])
        fps = float(expected.get("fps") or info.get("fps") or 25)
        tol = max(2.0 / fps, 0.1)
        diff = dur - exp
        checks["duration"] = {"expected": round(exp, 3), "actual": round(dur, 3), "diff": round(diff, 3)}
        if abs(diff) > 0.5:
            failures.append(f"duration {dur:.3f}s differs from the timeline ({exp:.3f}s) by {diff:+.3f}s")
        elif abs(diff) > tol:
            warnings.append(f"duration {dur:.3f}s is {diff:+.3f}s off the timeline")
    for key in ("width", "height"):
        if expected.get(key) and info.get(key) != expected[key]:
            failures.append(f"{key} is {info.get(key)}, expected {expected[key]}")
    if expected.get("fps") and info.get("fps") and abs(info["fps"] - expected["fps"]) > 0.01:
        warnings.append(f"frame rate {info['fps']:.3f} differs from expected {expected['fps']:.3f}")
    if expected.get("soft_captions") and not any(s.get("codec_type") == "subtitle" for s in streams):
        failures.append("a soft caption track was requested but the file has none")

    if decode:
        L = expected.get("loudness")
        a = analyse_stream(path, want_loudness=bool(info.get("has_audio")))
        if a["returncode"] != 0:
            failures.append("the file does not decode cleanly end to end")
        if a["decode_errors"]:
            warnings.append(f"{len(a['decode_errors'])} decoder error line(s), first: {a['decode_errors'][0][:160]}")
        exp_black = expected.get("expected_black") or []
        odd_black = []
        for b in a["blacks"]:
            length = b[1] - b[0]
            covered = sum(_overlap(b, e) for e in exp_black)
            if b[0] < 0.05 and length < 1.6 or b[1] > dur - 0.05 and length < 1.6:
                continue
            if covered >= 0.5 * length:
                continue
            odd_black.append([round(b[0], 2), round(b[1], 2)])
        checks["black_segments"] = [[round(x, 2), round(y, 2)] for x, y in a["blacks"]]
        if odd_black:
            warnings.append(f"unexpected black picture at {odd_black} (seconds); check for missing media")
        dead = [[round(s, 2), round(e if e is not None else dur, 2)] for s, e in a["silences"]]
        checks["silences"] = dead
        long_dead = [d for d in dead if d[1] - d[0] >= 2.0]
        if long_dead and info.get("has_audio"):
            warnings.append(f"silence >= 2 s at {long_dead} (seconds); intended?")
        loud = a["loudness"]
        if loud and V.is_finite(loud.get("input_i")):
            I, TP = float(loud["input_i"]), float(loud["input_tp"])
            checks["loudness"] = {"integrated_lufs": I, "true_peak_dbtp": TP, "lra": float(loud.get("input_lra", 0))}
            if L:
                off = I - float(L["target_lufs"])
                checks["loudness"]["target_lufs"] = L["target_lufs"]
                if abs(off) > 2.0:
                    failures.append(f"integrated loudness {I:.1f} LUFS is {off:+.1f} LU off target {L['target_lufs']}")
                elif abs(off) > 1.0:
                    warnings.append(f"integrated loudness {I:.1f} LUFS is {off:+.1f} LU off target {L['target_lufs']}")
                if TP > float(L["true_peak"]) + 0.5:
                    warnings.append(f"true peak {TP:.1f} dBTP exceeds the {L['true_peak']} dBTP ceiling")
        elif info.get("has_audio"):
            warnings.append("audio is silent or loudness could not be measured")

    try:
        result["contact_sheet"] = contact_sheet(path, dur, qc_dir, frames,
                                                vertical=(info.get("height") or 0) > (info.get("width") or 0))
    except RuntimeError as exc:
        warnings.append(f"contact sheet failed: {exc}")
    if not result.get("contact_sheet"):
        warnings.append("contact sheet could not be created")
    return _finish(result, qc_dir)


def _finish(result, qc_dir):
    result["status"] = "FAIL" if result["failures"] else ("WARN" if result["warnings"] else "PASS")
    try:
        qc_dir.mkdir(parents=True, exist_ok=True)
        rp = qc_dir / "qc_report.json"
        result["report_path"] = str(rp)
        rp.write_text(json.dumps(result, indent=2, default=str))
    except OSError:
        pass
    return result


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--timeline", help="timeline.json to compare against")
    ap.add_argument("--preview", action="store_true", help="the file is a preview render (skip loudness target)")
    ap.add_argument("--qc-dir", help="where to write qc_report.json and contact_sheet.jpg")
    ap.add_argument("--frames", type=int, default=12, help="frames on the contact sheet")
    ap.add_argument("--no-decode", action="store_true", help="skip the full decode pass (faster, fewer checks)")
    args = ap.parse_args(argv)
    if not V.which("ffprobe"):
        print("ffprobe not found; cannot verify the file.")
        return 1
    expected = None
    if args.timeline:
        tl = V.resolve_timeline(args.timeline)
        expected = expected_from_timeline(tl, preview=args.preview)
        if args.preview:
            expected.pop("width"), expected.pop("height")
    res = run_qc(args.video, expected, args.qc_dir, args.frames, decode=not args.no_decode)
    print(f"QC {res['status']}: {res['file']}")
    if res.get("probe"):
        p = res["probe"]
        print(f"  {p.get('width')}x{p.get('height')} {p.get('codec')} {p.get('pix_fmt')} "
              f"@ {p.get('fps') and round(p['fps'], 3)} fps, {V.clock(p.get('duration') or 0)}, "
              f"audio {p.get('audio_codec')} {p.get('sample_rate')} Hz x{p.get('channels')}")
    if res["checks"].get("loudness"):
        l = res["checks"]["loudness"]
        print(f"  loudness {l['integrated_lufs']:.1f} LUFS, true peak {l['true_peak_dbtp']:.1f} dBTP")
    for f in res["failures"]:
        print(f"  FAIL  {f}")
    for w in res["warnings"]:
        print(f"  WARN  {w}")
    if res.get("contact_sheet"):
        print(f"  contact sheet: {res['contact_sheet']}")
    print(f"  report: {res.get('report_path')}")
    return 1 if res["status"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
