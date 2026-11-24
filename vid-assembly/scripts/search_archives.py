#!/usr/bin/env python3
"""Search open archives for footage, stills, music and sound effects, with licence metadata.

Providers (all free, no API key):
  ia        Internet Archive (incl. Prelinger Archives, newsreels, government films)
  nasa      NASA Image and Video Library
  commons   Wikimedia Commons
  loc       Library of Congress
  openverse Openverse (CC-licensed and public-domain images and audio, e.g. Freesound, Jamendo)

Every candidate carries the licence/rights statement the archive publishes and a
`rights_hint`. Hints are a starting point, not clearance: confirm the rights on the
landing page before using anything, and log it in asset_log.csv (fetch_asset.py does that).
Never cite an asset that this script or the user did not actually return.

Usage:
  python search_archives.py "apollo 11 launch" --providers ia,nasa,commons --media video \
      --limit 8 --out research/candidates.json --md research/candidates.md
  python search_archives.py "typewriter" --providers openverse --media audio --commercial
  python search_archives.py resolve ia:apollo11launch     # list downloadable files for one item
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = "vid-assembly/1.0 (documentary research script; contact via project maintainer)"
TIMEOUT = 20


def get_json(url: str, params: dict | None = None):
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8", errors="replace"))


def strip_html(s) -> str:
    if s is None:
        return ""
    if isinstance(s, list):
        s = " ".join(str(x) for x in s)
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", str(s))).split())


def first(v):
    return v[0] if isinstance(v, list) and v else v


def licence_from_url(url: str | None) -> str:
    if not url:
        return ""
    u = url.lower()
    if "publicdomain/zero" in u:
        return "CC0 1.0"
    if "publicdomain/mark" in u:
        return "Public Domain Mark"
    m = re.search(r"licenses/([a-z-]+)/(\d\.\d)", u)
    if m:
        return f"CC {m.group(1).upper()} {m.group(2)}"
    return url


def rights_hint(licence: str, provider: str, extra: str = "") -> str:
    l = (licence or "").lower()
    if provider == "nasa":
        return ("likely public domain (US federal work, 17 U.S.C. 105) unless a third-party credit appears; "
                "no NASA logos or implied endorsement")
    if any(k in l for k in ("cc0", "public domain", "publicdomain", "pdm", "no known copyright", "pd-")):
        return "public domain (claimed by the archive): verify basis on the landing page"
    if "nc" in re.findall(r"\b(nc)\b", l) or "noncommercial" in l or "non-commercial" in l:
        return "non-commercial only: unusable for monetised/commercial work"
    if re.search(r"\bnd\b", l):
        return "no derivatives: cannot be cut or remixed into an edit"
    if re.search(r"\bby\b", l) or "attribution" in l:
        return "licensed: attribution required" + (" + share-alike" if re.search(r"\bsa\b", l) else "")
    return "rights unknown: treat as all rights reserved until verified" + (f" ({extra})" if extra else "")


# --------------------------------------------------------------- parsers
def parse_ia(data) -> list[dict]:
    out = []
    for d in (data.get("response") or {}).get("docs", []):
        ident = d.get("identifier")
        if not ident:
            continue
        lic_url = first(d.get("licenseurl")) or ""
        coll = d.get("collection") or []
        coll = coll if isinstance(coll, list) else [coll]
        note = "Prelinger Archives item: generally released to the public domain; confirm on the item page" \
            if any("prelinger" in str(c).lower() for c in coll) else ""
        lic = licence_from_url(lic_url) or (strip_html(d.get("rights"))[:120] if d.get("rights") else "")
        out.append({
            "provider": "ia", "id": f"ia:{ident}", "title": strip_html(first(d.get("title"))),
            "date": str(first(d.get("date")) or first(d.get("year")) or ""),
            "creator": strip_html(first(d.get("creator"))), "description": strip_html(d.get("description"))[:300],
            "media_type": d.get("mediatype", ""), "landing_url": f"https://archive.org/details/{ident}",
            "download_url": None, "license": lic, "license_url": lic_url, "collections": coll,
            "rights_hint": rights_hint(lic, "ia", "uploader-supplied metadata") + (f"; {note}" if note else ""),
        })
    return out


def parse_ia_files(ident: str, meta) -> list[dict]:
    files = []
    for f in meta.get("files", []):
        name = f.get("name", "")
        fmt = str(f.get("format", ""))
        ext = Path(name).suffix.lower()
        if ext in (".mp4", ".mov", ".mkv", ".mpg", ".mpeg", ".avi", ".ogv", ".webm", ".m4v", ".mp3", ".wav",
                   ".flac", ".ogg", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".gif"):
            files.append({"name": name, "format": fmt, "source": f.get("source", ""),
                          "size_bytes": int(f.get("size") or 0), "width": f.get("width"), "height": f.get("height"),
                          "length": f.get("length"),
                          "url": f"https://archive.org/download/{ident}/{urllib.parse.quote(name)}"})
    files.sort(key=lambda x: (x["source"] != "original", -x["size_bytes"]))
    md = meta.get("metadata", {})
    return [{"item": ident, "title": strip_html(first(md.get("title"))),
             "license_url": first(md.get("licenseurl")) or "", "rights": strip_html(md.get("rights"))[:300],
             "files": files}]


def parse_nasa(data) -> list[dict]:
    out = []
    for it in (data.get("collection") or {}).get("items", []):
        d = (it.get("data") or [{}])[0]
        nid = d.get("nasa_id")
        if not nid:
            continue
        thumb = next((l.get("href") for l in it.get("links", []) if l.get("rel") == "preview"), None)
        credit = d.get("secondary_creator") or d.get("photographer") or ""
        out.append({
            "provider": "nasa", "id": f"nasa:{nid}", "title": d.get("title", ""),
            "date": (d.get("date_created") or "")[:10], "creator": strip_html(credit) or d.get("center", "NASA"),
            "description": strip_html(d.get("description"))[:300], "media_type": d.get("media_type", ""),
            "landing_url": f"https://images.nasa.gov/details/{urllib.parse.quote(nid)}", "download_url": None,
            "thumbnail": thumb, "license": "NASA media usage guidelines",
            "license_url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
            "rights_hint": rights_hint("", "nasa") + (f"; credit line: {credit}" if credit else ""),
        })
    return out


def parse_nasa_asset(nid: str, data) -> list[dict]:
    hrefs = [i.get("href") for i in (data.get("collection") or {}).get("items", []) if i.get("href")]
    files = [{"name": h.rsplit("/", 1)[-1], "url": h.replace("http://", "https://", 1)} for h in hrefs
             if not h.endswith((".json", ".srt", ".vtt"))]
    order = ["~orig", "~large", "~medium", "~small", "~mobile", "~preview", "~thumb"]
    files.sort(key=lambda f: next((i for i, o in enumerate(order) if o in f["name"]), 99))
    return [{"item": nid, "files": files, "captions": [h for h in hrefs if h.endswith((".srt", ".vtt"))]}]


def parse_commons(data) -> list[dict]:
    out = []
    pages = (data.get("query") or {}).get("pages") or {}
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        em = ii.get("extmetadata") or {}
        val = lambda k: strip_html((em.get(k) or {}).get("value"))  # noqa: E731
        lic = val("LicenseShortName") or val("UsageTerms")
        artist, credit = val("Artist"), val("Credit")
        attrib_req = val("AttributionRequired").lower() == "true"
        title = p.get("title", "")
        out.append({
            "provider": "commons", "id": f"commons:{title}", "title": title.replace("File:", "", 1),
            "date": val("DateTimeOriginal")[:40], "creator": artist[:120], "description": val("ImageDescription")[:300],
            "media_type": ii.get("mediatype", "") or ii.get("mime", ""), "mime": ii.get("mime"),
            "width": ii.get("width"), "height": ii.get("height"), "size_bytes": ii.get("size"),
            "landing_url": ii.get("descriptionurl"), "download_url": ii.get("url"), "license": lic,
            "license_url": val("LicenseUrl"), "credit": credit[:200],
            "attribution": (f"{title.replace('File:', '', 1)} by {artist or 'unknown'}, {lic}, via Wikimedia Commons"
                            if attrib_req else ""),
            "rights_hint": rights_hint(lic, "commons"),
        })
    return out


def parse_loc(data) -> list[dict]:
    out = []
    for r in data.get("results", []):
        url = r.get("url") or r.get("id")
        if not url:
            continue
        rights = strip_html(r.get("rights") or r.get("rights_advisory") or "")
        out.append({
            "provider": "loc", "id": f"loc:{url.rstrip('/').rsplit('/', 1)[-1]}", "title": strip_html(r.get("title")),
            "date": str(r.get("date") or ""), "creator": strip_html(first(r.get("contributor")) or ""),
            "description": strip_html(r.get("description"))[:300],
            "media_type": ", ".join(r.get("original_format") or []) if isinstance(r.get("original_format"), list) else "",
            "landing_url": url, "download_url": None, "thumbnail": first(r.get("image_url")),
            "license": rights[:200] or "see Rights & Access on the item page", "license_url": url,
            "rights_hint": ("check the item's Rights & Access statement; 'no known restrictions' means the "
                            "Library found none, not that none exist"),
        })
    return out


def parse_openverse(data, media: str) -> list[dict]:
    out = []
    for r in data.get("results", []):
        lic = f"CC {str(r.get('license', '')).upper()} {r.get('license_version') or ''}".strip()
        if str(r.get("license", "")).lower() in ("cc0", "pdm"):
            lic = "CC0 1.0" if r.get("license") == "cc0" else "Public Domain Mark"
        out.append({
            "provider": "openverse", "id": f"openverse:{r.get('id')}", "title": r.get("title") or "",
            "date": "", "creator": r.get("creator") or "", "description": "",
            "media_type": media, "source": r.get("source") or r.get("provider"),
            "landing_url": r.get("foreign_landing_url"), "download_url": r.get("url"),
            "duration_s": round((r.get("duration") or 0) / 1000, 1) if media == "audio" and r.get("duration") else None,
            "license": lic, "license_url": r.get("license_url"), "attribution": r.get("attribution") or "",
            "rights_hint": rights_hint(lic, "openverse"),
        })
    return out


# --------------------------------------------------------------- searches
IA_MEDIA = {"video": "movies", "audio": "audio", "image": "image"}


def search(provider: str, query: str, media: str, limit: int, commercial: bool) -> list[dict]:
    if provider == "ia":
        q = f"({query}) AND mediatype:({IA_MEDIA[media]})"
        data = get_json("https://archive.org/advancedsearch.php", {
            "q": q, "fl[]": ["identifier", "title", "date", "year", "creator", "licenseurl", "rights", "collection",
                             "description", "mediatype"], "rows": limit, "page": 1, "output": "json"})
        return parse_ia(data)
    if provider == "nasa":
        data = get_json("https://images-api.nasa.gov/search", {"q": query, "media_type": media, "page_size": limit})
        return parse_nasa(data)
    if provider == "commons":
        ft = {"video": "video", "image": "bitmap", "audio": "audio"}[media]
        data = get_json("https://commons.wikimedia.org/w/api.php", {
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{query} filetype:{ft}",
            "gsrnamespace": 6, "gsrlimit": limit, "prop": "imageinfo",
            "iiprop": "url|extmetadata|size|mime|mediatype",
            "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal|ImageDescription|"
                                   "UsageTerms|AttributionRequired|Copyrighted"})
        return parse_commons(data)
    if provider == "loc":
        fmt = {"video": "video", "image": "image", "audio": "audio"}[media]
        data = get_json("https://www.loc.gov/search/", {"q": query, "fo": "json", "fa": f"online-format:{fmt}", "c": limit})
        return parse_loc(data)
    if provider == "openverse":
        if media == "video":
            return []
        params = {"q": query, "page_size": min(limit, 20)}
        if commercial:
            params["license_type"] = "commercial,modification"
        data = get_json(f"https://api.openverse.org/v1/{'audio' if media == 'audio' else 'images'}/", params)
        return parse_openverse(data, media)
    raise ValueError(f"unknown provider {provider}")


def resolve(item_id: str) -> list[dict]:
    prov, _, ident = item_id.partition(":")
    if prov == "ia":
        return parse_ia_files(ident, get_json(f"https://archive.org/metadata/{urllib.parse.quote(ident)}"))
    if prov == "nasa":
        return parse_nasa_asset(ident, get_json(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(ident)}"))
    raise ValueError("resolve supports ia:<identifier> and nasa:<nasa_id> (other providers return direct URLs)")


def to_markdown(cands: list[dict], query: str) -> str:
    rows = [f"# Archive candidates for: {query}\n",
            "_Rights hints are not clearance: confirm on the landing page, then log the asset._\n",
            "| Id | Title | Date | Licence / rights | Hint | Link |", "|---|---|---|---|---|---|"]
    for c in cands:
        title = (c["title"] or "")[:70].replace("|", "/")
        rows.append(f"| `{c['id'][:60]}` | {title} | {c.get('date', '')[:10]} | {str(c.get('license', ''))[:50]} | "
                    f"{c['rights_hint'][:80]} | {c.get('landing_url') or ''} |")
    return "\n".join(rows) + "\n"


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv and argv[0] == "resolve":
        ap = argparse.ArgumentParser(prog="search_archives.py resolve")
        ap.add_argument("cmd")
        ap.add_argument("item_id", help="ia:<identifier> or nasa:<nasa_id>")
        a = ap.parse_args(argv)
        try:
            print(json.dumps(resolve(a.item_id), indent=2))
            return 0
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            print(f"Could not resolve {a.item_id}: {exc}")
            return 1
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("query")
    ap.add_argument("--providers", default="ia,nasa,commons,loc", help="comma list: ia,nasa,commons,loc,openverse")
    ap.add_argument("--media", choices=["video", "image", "audio"], default="video")
    ap.add_argument("--limit", type=int, default=8, help="results per provider")
    ap.add_argument("--commercial", action="store_true", help="Openverse: only licences allowing commercial use + edits")
    ap.add_argument("--out", help="write candidates JSON")
    ap.add_argument("--md", help="write a Markdown summary table")
    args = ap.parse_args(argv)
    cands, status = [], {}
    for prov in [p.strip() for p in args.providers.split(",") if p.strip()]:
        try:
            got = search(prov, args.query, args.media, args.limit, args.commercial)
            status[prov] = f"{len(got)} result(s)"
            cands.extend(got)
        except urllib.error.HTTPError as exc:
            status[prov] = f"HTTP {exc.code}"
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            status[prov] = f"unreachable ({getattr(exc, 'reason', exc)})"
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            status[prov] = f"unexpected response ({exc})"
    for prov, st in status.items():
        print(f"  {prov:<10} {st}")
    for c in cands:
        print(f"- [{c['id'][:70]}] {c['title'][:80]} ({c.get('date', '')[:10]})\n    {c['rights_hint']}\n    {c.get('landing_url')}")
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps({"query": args.query, "media": args.media, "status": status,
                                              "candidates": cands}, indent=2), encoding="utf-8")
        print(f"Candidates JSON: {args.out}")
    if args.md:
        Path(args.md).parent.mkdir(parents=True, exist_ok=True)
        Path(args.md).write_text(to_markdown(cands, args.query), encoding="utf-8")
        print(f"Candidates table: {args.md}")
    if not cands:
        print("No candidates returned. If providers were unreachable, report that plainly; do not invent sources.")
    return 0 if cands else 1


if __name__ == "__main__":
    sys.exit(main())
