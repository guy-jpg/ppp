#!/usr/bin/env python3
"""Report which video tools are available and what this machine can deliver.

Run this first in every production. It decides the capability tier:
  FULL       FFmpeg + ffprobe with every filter the renderer uses -> real renders
  REDUCED    FFmpeg present but some features missing (listed, with the fallback)
  PLAN_ONLY  no FFmpeg/ffprobe -> deliver the edit package, never claim a render

Usage: python check_env.py [--json] [--network]
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

REQUIRED_FILTERS = {
    "xfade": "transitions other than cuts (fallback: use cuts only)",
    "zoompan": "Ken Burns motion on stills (fallback: motion 'none')",
    "loudnorm": "loudness normalisation (fallback: set output.loudness to null; limiter only)",
    "sidechaincompress": "music ducking under narration (fallback: mix.ducking.enabled false, lower music gain)",
    "acrossfade": "audio under transitions",
    "amix": "audio mixing",
    "drawtext": "title cards and lower thirds (needs libfreetype; fallback: no text overlays)",
    "subtitles": "burned-in captions (needs libass; fallback: captions.mode 'soft' or 'sidecar')",
    "blackdetect": "QC black-frame check", "silencedetect": "QC dead-air check, caption timing",
    "tile": "QC contact sheets", "bwdif": "deinterlacing archival video", "gblur": "blurred fill for vertical",
}
ENCODERS = {"libx264": "H.264 delivery (required for the default presets)", "aac": "AAC audio",
            "prores_ks": "ProRes masters", "libx265": "HEVC", "libvpx-vp9": "VP9/WebM", "ffv1": "10-bit intermediates",
            "mov_text": "soft captions in MP4"}
OPTIONAL_TOOLS = {
    "whisper": "speech-to-text for caption timing (openai-whisper CLI)",
    "whisper-cli": "speech-to-text (whisper.cpp)",
    "piper": "offline neural TTS for scratch narration",
    "espeak-ng": "basic offline TTS for scratch narration timing",
    "say": "macOS TTS for scratch narration",
    "yt-dlp": "downloading from sites that need it (check terms and licences first)",
    "melt": "MLT/Shotcut command-line renderer", "blender": "Blender (VSE)",
    "fc-match": "font lookup for titles", "curl": "downloads",
}
PY_MODULES = {"faster_whisper": "speech-to-text (Python)", "whisper": "speech-to-text (Python)",
              "opentimelineio": "NLE interchange (FCPXML/EDL/OTIO export)"}
NETWORK_PROBES = {
    "Internet Archive": "https://archive.org/advancedsearch.php?q=test&fl[]=identifier&rows=1&output=json",
    "NASA Image and Video Library": "https://images-api.nasa.gov/search?q=apollo&page_size=1",
    "Wikimedia Commons": "https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json",
    "Library of Congress": "https://www.loc.gov/search/?q=test&fo=json&c=1",
    "Openverse": "https://api.openverse.org/v1/images/?q=test&page_size=1",
}


def ffmpeg_version():
    if not V.which("ffmpeg"):
        return None
    out = V.run(["ffmpeg", "-hide_banner", "-version"], check=False).stdout or ""
    m = re.search(r"ffmpeg version (\S+)", out)
    return m.group(1) if m else "unknown"


def check(network: bool = False) -> dict:
    res = {"ffmpeg": ffmpeg_version(), "ffprobe": bool(V.which("ffprobe")), "filters": {}, "encoders": {},
           "tools": {}, "python_modules": {}, "fonts": {}, "network": {}, "degraded": [], "tier": "PLAN_ONLY"}
    if res["ffmpeg"] and res["ffprobe"]:
        flist = V.run(["ffmpeg", "-hide_banner", "-filters"], check=False).stdout or ""
        elist = V.run(["ffmpeg", "-hide_banner", "-encoders"], check=False).stdout or ""
        for f, why in REQUIRED_FILTERS.items():
            ok = re.search(rf"^\s*\S+\s+{re.escape(f)}\s", flist, re.M) is not None
            res["filters"][f] = ok
            if not ok:
                res["degraded"].append(f"missing filter {f}: {why}")
        for e, why in ENCODERS.items():
            ok = re.search(rf"^\s*\S+\s+{re.escape(e)}\s", elist, re.M) is not None
            res["encoders"][e] = ok
            if not ok and e in ("libx264", "aac"):
                res["degraded"].append(f"missing encoder {e}: {why}")
        res["tier"] = "FULL" if not res["degraded"] else "REDUCED"
    for t, why in OPTIONAL_TOOLS.items():
        res["tools"][t] = V.which(t)
    for m in PY_MODULES:
        res["python_modules"][m] = importlib.util.find_spec(m) is not None
    for fam in ("Sans", "Serif"):
        res["fonts"][fam] = V.resolve_font(fam)
    if network:
        for name, url in NETWORK_PROBES.items():
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "vid-assembly/1.0 (research tool)"})
                with urllib.request.urlopen(req, timeout=8) as r:
                    res["network"][name] = f"ok ({r.status})"
            except Exception as exc:  # noqa: BLE001 - report any failure
                res["network"][name] = f"unreachable ({type(exc).__name__}: {str(exc)[:80]})"
    return res


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true", help="print machine-readable JSON")
    ap.add_argument("--network", action="store_true", help="also test access to public archive APIs")
    args = ap.parse_args(argv)
    res = check(args.network)
    if args.json:
        print(json.dumps(res, indent=2))
        return 0
    print(f"Capability tier: {res['tier']}")
    print(f"  ffmpeg: {res['ffmpeg'] or 'NOT FOUND'}   ffprobe: {'yes' if res['ffprobe'] else 'NOT FOUND'}")
    if res["tier"] == "PLAN_ONLY":
        print("  -> No renderer. Produce the edit package (brief, storyboard, timeline.json, edit plan,\n"
              "     captions, asset log) and say clearly that no video file was rendered.\n"
              "     Install FFmpeg (https://ffmpeg.org/download.html) to enable rendering.")
    for d in res["degraded"]:
        print(f"  degraded: {d}")
    enc = [e for e, ok in res["encoders"].items() if ok]
    if enc:
        print(f"  encoders: {', '.join(enc)}")
    tools = [f"{t}" for t, p in res["tools"].items() if p]
    print(f"  optional tools found: {', '.join(tools) or 'none'}")
    mods = [m for m, ok in res["python_modules"].items() if ok]
    print(f"  python modules: {', '.join(mods) or 'none of ' + ', '.join(PY_MODULES)}")
    if not (res["tools"].get("whisper") or res["tools"].get("whisper-cli") or res["python_modules"].get("faster_whisper")
            or res["python_modules"].get("whisper")):
        print("  captions: no speech-to-text found; captions will be timed from the script text "
              "(make_captions.py from-timeline) and need a spot-check")
    if not any(res["tools"].get(t) for t in ("piper", "espeak-ng", "say")):
        print("  narration: no local TTS; narration must be recorded or supplied (or use a TTS service the user approves)")
    print(f"  fonts: Sans -> {res['fonts']['Sans']}; Serif -> {res['fonts']['Serif']}")
    for name, st in res["network"].items():
        print(f"  network {name}: {st}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
