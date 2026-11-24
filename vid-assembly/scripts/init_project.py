#!/usr/bin/env python3
"""Create a production folder with the standard layout and starter documents.

Usage:
  python init_project.py productions/moon-race --title "The Race to the Moon" --preset youtube-1080p

Existing files are never overwritten, so it is safe to re-run on a project.

Layout:
  brief.md                creative brief (fill in / confirm with the user first)
  research/sources.md     research notes with citations; candidates.json from search_archives.py
  script/narration.md     narration script, one block per VO item
  storyboard.md           scene-by-scene storyboard for approval
  timeline.json           the edit (source of truth for rendering)
  asset_log.csv           provenance and licence of every asset used
  media/{archival,stills,user,graphics}/   picture sources
  audio/{narration,music,sfx}/             sound sources
  captions/  build/  exports/
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

TEMPLATES = Path(__file__).resolve().parent.parent / "assets" / "templates"
DIRS = ["research", "script", "media/archival", "media/stills", "media/user", "media/graphics",
        "audio/narration", "audio/music", "audio/sfx", "captions", "build", "exports"]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project_dir")
    ap.add_argument("--title", required=True)
    ap.add_argument("--preset", default=V.DEFAULT_PRESET, choices=sorted(V.PRESETS))
    args = ap.parse_args(argv)

    root = Path(args.project_dir)
    root.mkdir(parents=True, exist_ok=True)
    for d in DIRS:
        (root / d).mkdir(parents=True, exist_ok=True)
    slug = V.slugify(args.title)
    subs = {"{{TITLE}}": args.title, "{{DATE}}": date.today().isoformat(), "{{PRESET}}": args.preset,
            "{{SLUG}}": slug}
    created, kept = [], []
    plan = {"brief.md": "brief.md", "storyboard.md": "storyboard.md", "research/sources.md": "sources.md",
            "script/narration.md": "narration.md"}
    for dest, tpl in plan.items():
        target = root / dest
        if target.exists():
            kept.append(dest)
            continue
        text = (TEMPLATES / tpl).read_text(encoding="utf-8")
        for k, v in subs.items():
            text = text.replace(k, v)
        target.write_text(text, encoding="utf-8")
        created.append(dest)
    tl = root / "timeline.json"
    if tl.exists():
        kept.append("timeline.json")
    else:
        data = json.loads((TEMPLATES / "timeline.json").read_text(encoding="utf-8"))
        data["title"] = args.title
        for clip in data.get("clips", []):
            if clip.get("text") == "{{TITLE}}":
                clip["text"] = args.title
        ext = V.PRESETS[args.preset].get("container", "mp4")
        data["output"] = {"preset": args.preset, "path": f"exports/{slug}_v1.{ext}"}
        tl.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        created.append("timeline.json")
    log = root / "asset_log.csv"
    if log.exists():
        kept.append("asset_log.csv")
    else:
        shutil.copyfile(TEMPLATES / "asset_log.csv", log)
        created.append("asset_log.csv")
    gi = root / ".gitignore"
    if not gi.exists():
        gi.write_text("build/\n", encoding="utf-8")
    print(f"Project ready: {root.resolve()}")
    if created:
        print("  created: " + ", ".join(created))
    if kept:
        print("  kept existing: " + ", ".join(kept))
    return 0


if __name__ == "__main__":
    sys.exit(main())
