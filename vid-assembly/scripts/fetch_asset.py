#!/usr/bin/env python3
"""Download one media asset and record its provenance in asset_log.csv.

Every downloaded file gets a log row (source URL, archive, creator, licence,
attribution, retrieval date) so the rights trail is never reconstructed from
memory. New rows default to status "pending": set "cleared" only after the
licence has been checked on the landing page.

Usage:
  python fetch_asset.py URL --dest media/archival/launch.mp4 --log asset_log.csv \
      --title "Apollo 11 launch" --archive "NASA" --license "Public domain (US Gov)" \
      --source-url https://images.nasa.gov/details/... [--status cleared]
  python fetch_asset.py URL --dest media/stills/x.jpg --log asset_log.csv \
      --from-candidates research/candidates.json --candidate commons:File:X.jpg
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

UA = "vid-assembly/1.0 (documentary research script)"


def next_asset_id(rows) -> str:
    nums = [int(r["asset_id"][1:]) for r in rows if (r.get("asset_id") or "").startswith("A") and r["asset_id"][1:].isdigit()]
    return f"A{(max(nums) + 1) if nums else 1:03d}"


def download(url: str, dest: Path, max_mb: float) -> int:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    tmp = dest.with_name(dest.name + ".part")
    with urllib.request.urlopen(req, timeout=60) as r:
        ctype = (r.headers.get("Content-Type") or "").lower()
        if ctype.startswith("text/html"):
            raise RuntimeError("the URL returned a web page, not a media file; use the direct file URL "
                               "(search_archives.py resolve <id> lists them)")
        length = int(r.headers.get("Content-Length") or 0)
        if length and length > max_mb * 1024 * 1024:
            raise RuntimeError(f"file is {length / 1e6:.0f} MB (limit {max_mb:.0f} MB); pass --max-mb to allow it")
        total, t0 = 0, time.time()
        with open(tmp, "wb") as fh:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_mb * 1024 * 1024:
                    raise RuntimeError(f"download exceeded {max_mb:.0f} MB; pass --max-mb to allow it")
                fh.write(chunk)
                if time.time() - t0 > 2:
                    print(f"  {total / 1e6:.1f} MB", flush=True)
                    t0 = time.time()
    tmp.replace(dest)
    return total


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--dest", required=True, help="where to save the file (inside the project's media/ or audio/)")
    ap.add_argument("--log", required=True, help="asset_log.csv to append to")
    ap.add_argument("--from-candidates", help="candidates JSON written by search_archives.py")
    ap.add_argument("--candidate", help="candidate id to copy metadata from")
    for f in ("asset_id", "title", "kind", "archive", "source_url", "creator", "date", "license", "license_url",
              "pd_basis", "attribution", "restrictions", "notes"):
        ap.add_argument("--" + f.replace("_", "-"))
    ap.add_argument("--status", default="pending", choices=["pending", "cleared", "public_domain", "licensed",
                                                             "owned", "user_supplied", "restricted"])
    ap.add_argument("--max-mb", type=float, default=2048)
    ap.add_argument("--force", action="store_true", help="overwrite an existing file")
    args = ap.parse_args(argv)

    meta = {}
    if args.from_candidates and args.candidate:
        data = json.loads(Path(args.from_candidates).read_text(encoding="utf-8"))
        cand = next((c for c in data.get("candidates", []) if c.get("id") == args.candidate), None)
        if cand is None:
            print(f"Candidate {args.candidate!r} not found in {args.from_candidates}")
            return 1
        meta = {"title": cand.get("title"), "archive": cand.get("provider"), "source_url": cand.get("landing_url"),
                "creator": cand.get("creator"), "date": cand.get("date"), "license": cand.get("license"),
                "license_url": cand.get("license_url"), "attribution": cand.get("attribution"),
                "notes": cand.get("rights_hint")}
    for k in meta.copy():
        if getattr(args, k, None):
            meta[k] = getattr(args, k)
    for k in ("asset_id", "title", "kind", "archive", "source_url", "creator", "date", "license", "license_url",
              "pd_basis", "attribution", "restrictions", "notes"):
        if getattr(args, k, None) and not meta.get(k):
            meta[k] = getattr(args, k)

    dest = Path(args.dest)
    if dest.exists() and not args.force:
        print(f"{dest} already exists (use --force to overwrite). Nothing downloaded.")
        return 1
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        size = download(args.url, dest, args.max_mb)
    except (urllib.error.URLError, TimeoutError, OSError, RuntimeError) as exc:
        print(f"DOWNLOAD FAILED: {exc}\nNo file was saved and nothing was logged.")
        return 1
    info = {}
    if V.which("ffprobe"):
        try:
            info = V.media_info(dest)
        except RuntimeError as exc:
            print(f"Warning: downloaded file is not readable media: {exc}")
    log = Path(args.log)
    rows = V.read_asset_log(log)
    aid = meta.get("asset_id") or next_asset_id(rows)
    try:
        rel = dest.resolve().relative_to(log.resolve().parent).as_posix()
    except ValueError:
        rel = str(dest)
    V.append_asset_log(log, {
        "asset_id": aid, "file": rel, "title": meta.get("title", ""), "kind": meta.get("kind") or info.get("kind", ""),
        "source_archive": meta.get("archive", ""), "source_url": meta.get("source_url") or args.url,
        "creator": meta.get("creator", ""), "date": meta.get("date", ""), "license": meta.get("license", ""),
        "license_url": meta.get("license_url", ""), "pd_basis": meta.get("pd_basis", ""),
        "attribution": meta.get("attribution", ""), "restrictions": meta.get("restrictions", ""),
        "retrieved": date.today().isoformat(), "status": args.status,
        "notes": (meta.get("notes") or "") + f" | downloaded from {args.url}"})
    desc = f"{info.get('kind', '?')} {V.clock(info['duration']) if info.get('duration') else ''} " \
           f"{info.get('width') or ''}{'x' if info.get('width') else ''}{info.get('height') or ''}".strip()
    print(f"Saved {dest} ({V.human_size(size)}; {desc}) and logged as {aid} with status '{args.status}'.")
    if args.status == "pending":
        print("  Rights are PENDING: verify the licence on the landing page, then set status to cleared.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
