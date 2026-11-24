#!/usr/bin/env python3
"""Validate a timeline and write the human-readable edit plan.

Checks everything render.py needs (sources exist, in/out inside the media,
transitions fit, anchors resolve) plus editorial and legal hygiene:
  * rights: every source has an asset_log.csv entry; pending/restricted
    licences, NC/ND/SA terms (with --commercial) and required attributions
  * pacing: average shot length, static stills, held shots, reused footage
  * narration: words per minute, wall-to-wall narration, overlaps, dead air
  * captions: cue lint and cues past the end of the program
  * disclosure: shots labelled illustrative / reenactment / ai_generated

Usage:
  python validate_timeline.py timeline.json --report edit_plan.md [--assets asset_log.csv]
                              [--commercial] [--json resolved.json]
Exit status: 0 = renderable (warnings allowed), 1 = errors.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

CLEARED = {"cleared", "public_domain", "pd", "licensed", "owned", "user_supplied", "commissioned", "cc0"}
BLOCKED = {"restricted", "rejected", "do_not_use"}
DISCLOSE = {"illustrative", "reenactment", "re-enactment", "ai_generated", "synthetic", "simulation", "recreation"}


def words(text: str) -> int:
    return len(re.findall(r"[\w'-]+", text or ""))


def match_asset(source: str, asset_id, rows, base: Path):
    if asset_id:
        for r in rows:
            if r.get("asset_id") == str(asset_id):
                return r
    src = Path(source).resolve()
    for r in rows:
        f = (r.get("file") or "").strip()
        if not f:
            continue
        p = Path(f)
        p = p if p.is_absolute() else base / p
        if p.resolve() == src:
            return r
    for r in rows:
        if Path(r.get("file") or "").name == src.name:
            return r
    return None


def analyse(tl: dict, rows, commercial: bool):
    errors, warnings, info = list(tl["errors"]), list(tl["warnings"]), []
    base = Path(tl["base_dir"])
    fps = tl["output"]["fps"]
    total = tl["total_seconds"]

    # ---- rights
    used = []
    for c in tl["clips"]:
        if c.get("source"):
            used.append(("clip " + c["id"], c["source"], c.get("asset_id")))
    for key in ("narration", "music", "sfx"):
        for it in tl[key]:
            used.append((f"{key} {it['id']}", it["source"], it.get("asset_id")))
    credits, seen = [], set()
    if rows is None:
        warnings.append("no asset_log.csv: provenance and licences of the sources are unrecorded")
    else:
        for who, src, aid in used:
            r = match_asset(src, aid, rows, base)
            if r is None:
                warnings.append(f"{who}: {Path(src).name} has no entry in the asset log (source, licence unknown)")
                continue
            status = (r.get("status") or "").strip().lower()
            lic = (r.get("license") or "").upper()
            if status in BLOCKED:
                errors.append(f"{who}: asset {r.get('asset_id') or Path(src).name} is marked {status!r}; replace it")
            elif status not in CLEARED:
                warnings.append(f"{who}: rights for {r.get('asset_id') or Path(src).name} are not confirmed "
                                f"(status {status or 'blank'})")
            if commercial and re.search(r"\bNC\b|NON-?COMMERCIAL", lic):
                errors.append(f"{who}: licence {r.get('license')} forbids commercial use")
            if re.search(r"\bND\b|NO-?DERIV", lic):
                warnings.append(f"{who}: licence {r.get('license')} forbids derivatives; cutting/remixing it may breach the terms")
            if re.search(r"\bSA\b|SHARE-?ALIKE", lic):
                warnings.append(f"{who}: licence {r.get('license')} is share-alike; the finished video may have to carry the same licence")
            key = r.get("asset_id") or r.get("file")
            if key not in seen and (r.get("attribution") or re.search(r"\bBY\b", lic)):
                seen.add(key)
                credits.append(r)
            if key not in seen and status in ("public_domain", "pd") and r.get("source_archive"):
                seen.add(key)
                credits.append(r)  # courtesy credit for archives is good practice

    # ---- pacing
    shots = [c for c in tl["clips"] if c["type"] in ("video", "image")]
    asl = sum(c["seconds"] for c in shots) / len(shots) if shots else 0.0
    if shots:
        info.append(f"average shot length {asl:.1f}s over {len(shots)} picture shots")
    for c in shots:
        still = c["type"] == "image" or c.get("freeze")
        if still and c.get("motion") == "none" and c["seconds"] > 4:
            warnings.append(f"clip {c['id']}: {c['seconds']:.1f}s still without motion feels static; add a slow move")
        elif still and c["seconds"] > 9:
            warnings.append(f"clip {c['id']}: {c['seconds']:.1f}s on one still is long; split it or cut away")
        elif c["type"] == "video" and c["seconds"] > 15:
            info.append(f"clip {c['id']}: long hold ({c['seconds']:.1f}s); fine if the action carries it")
    spans = {}
    for c in shots:
        if c["type"] != "video":
            continue
        for other_id, (o_in, o_out) in spans.get(c["source"], []):
            if min(o_out, c["out"]) - max(o_in, c["in"]) > 0.5:
                warnings.append(f"clip {c['id']}: reuses footage already shown in {other_id} (same source range)")
        spans.setdefault(c["source"], []).append((c["id"], (c["in"], c["out"])))

    # ---- narration
    narr = sorted(tl["narration"], key=lambda n: n["start"])
    covered = 0.0
    for i, n in enumerate(narr):
        covered += n["duration"]
        if n.get("text"):
            wpm = words(n["text"]) / max(n["duration"], 0.1) * 60
            n["wpm"] = round(wpm)
            if wpm > 175:
                warnings.append(f"narration {n['id']}: {wpm:.0f} words/min is rushed for documentary (aim 130-160)")
        if i and narr[i - 1]["end"] > n["start"] + 0.05:
            warnings.append(f"narration {n['id']}: overlaps {narr[i - 1]['id']} by {narr[i - 1]['end'] - n['start']:.2f}s")
    if total and narr:
        pct = 100 * covered / total
        info.append(f"narration covers {pct:.0f}% of the running time")
        if pct > 85:
            warnings.append(f"narration covers {pct:.0f}% of the film: leave pauses so pictures and sound can breathe")
    # dead air: no narration, music or clip audio for >= 3 s
    step = 0.25
    t, run_start = 0.0, None
    beds = [(m["start"], m["end"]) for m in tl["music"]] + [(n["start"], n["end"]) for n in narr]
    beds += [(c["start"], c["end"]) for c in tl["clips"]
             if c["type"] == "video" and c["audio"] and (c.get("info") or {}).get("has_audio") and not c.get("freeze")]
    dead = []
    while t < total:
        sounding = any(a <= t < b for a, b in beds)
        if not sounding and run_start is None:
            run_start = t
        if sounding and run_start is not None:
            if t - run_start >= 3:
                dead.append((run_start, t))
            run_start = None
        t += step
    if run_start is not None and total - run_start >= 3:
        dead.append((run_start, total))
    for a, b in dead:
        warnings.append(f"no sound at all from {V.timecode(a, fps)} to {V.timecode(b, fps)}: add music, room tone or nat sound")

    # ---- captions
    cap = tl["captions"]
    if cap.get("path") and Path(cap["path"]).exists():
        try:
            import make_captions as MC
            cues = MC.read_cues(cap["path"])
            ce, cw = MC.lint(cues, MC.PROFILES["social" if tl["output"]["height"] > tl["output"]["width"] else "streaming"])
            if cues and cues[-1]["end"] > total + 0.05:
                warnings.append(f"captions run past the end of the program ({cues[-1]['end']:.2f}s > {total:.2f}s)")
            if ce:
                warnings.append(f"captions: {len(ce)} lint error(s), e.g. {ce[0]}")
            if cw:
                info.append(f"captions: {len(cw)} readability warning(s); run make_captions.py lint")
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"could not read captions: {exc}")
    elif not cap.get("path"):
        info.append("no captions file attached (captions are expected for accessibility)")

    disclose = [c for c in tl["clips"] if str(c.get("label") or "").lower() in DISCLOSE]
    return errors, warnings, info, credits, disclose, asl


def write_report(tl, path, errors, warnings, info, credits, disclose):
    fps = tl["output"]["fps"]
    tc = lambda s: V.timecode(s, fps)  # noqa: E731
    o = tl["output"]
    L = []
    L.append(f"# Edit plan: {tl['title']}\n")
    L.append(f"Generated {date.today().isoformat()} from `{Path(tl['path']).name}` · Running time "
             f"**{tc(tl['total_seconds'])}** ({tl['total_seconds']:.2f} s) · {o['width']}x{o['height']} @ "
             f"{V.fps_str(fps)} fps · preset `{o['preset']}` · output `{o['path']}`\n")
    L.append("## Status\n")
    L.append(f"- **{len(errors)} error(s)**, {len(warnings)} warning(s). "
             + ("Not renderable until errors are fixed." if errors else "Renderable."))
    for e in errors:
        L.append(f"- ERROR: {e}")
    for w in warnings:
        L.append(f"- Warning: {w}")
    for i in info:
        L.append(f"- Note: {i}")
    L.append("\n## Scene-by-scene edit\n")
    scenes = []
    for c in tl["clips"]:
        sc = c.get("scene") or "-"
        if not scenes or scenes[-1][0] != sc:
            scenes.append((sc, []))
        scenes[-1][1].append(c)
    for sc, clips in scenes:
        s0, s1 = clips[0]["start"], clips[-1]["end"]
        L.append(f"### Scene {sc} · {tc(s0)} to {tc(s1)} ({s1 - s0:.1f} s)\n")
        L.append("| Shot | Program in to out | Dur | Type | Source (in to out) | Framing / motion / grade | Transition in | Notes |")
        L.append("|---|---|---|---|---|---|---|---|")
        for c in clips:
            if c["type"] == "video":
                src = f"{Path(c['source']).name} ({V.clock(c['in'])}" + (" freeze)" if c.get("freeze") else f" to {V.clock(c['out'])})")
                if abs(c["speed"] - 1) > 1e-6:
                    src += f" @ {c['speed']}x"
            elif c["type"] == "image":
                src = Path(c["source"]).name
            else:
                src = f"{c['type']}: {(c.get('text') or c.get('color') or '').replace(chr(10), ' / ')}"
            motion = c.get("motion")
            if isinstance(motion, dict):
                motion = "zoom " + "-".join(str(z) for z in motion.get("zoom", [])) + (
                    f" focus {motion['focus']}" if motion.get("focus") else f" {motion.get('pan', 'center')}")
            framing = ", ".join(x for x in [c["fit"] if c["type"] in ("video", "image") else "",
                                            str(motion) if motion else
                                            ("push_in_slow (default)" if c["type"] == "image" else ""),
                                            c["grade"] if c["grade"] != "none" else ""] if x)
            t = c["transition"]
            trans = "cut" if not t["frames"] else f"{t['type']} {t['duration']:.2f}s"
            if c["fade_in"]:
                trans += f"; fade in {c['fade_in']:.2f}s"
            if c["fade_out"]:
                trans += f"; fade out {c['fade_out']:.2f}s"
            notes = "; ".join(x for x in [str(c.get("label")).upper() if c.get("label") else "",
                                          c.get("description") or "", c.get("note") or ""] if x)
            L.append(f"| {c['id']} | {tc(c['start'])} to {tc(c['end'])} | {c['seconds']:.2f}s | {c['type']} | {src} | "
                     f"{framing} | {trans} | {notes} |")
        L.append("")
    L.append("## Audio cue sheet\n")
    L.append("| Cue | Type | Program in to out | Source | Gain | Notes |")
    L.append("|---|---|---|---|---|---|")
    for key in ("narration", "music", "sfx"):
        for it in sorted(tl[key], key=lambda x: x["start"]):
            extra = []
            if it.get("text"):
                extra.append(f"\"{it['text'][:90]}{'...' if len(it['text']) > 90 else ''}\"")
            if it.get("wpm"):
                extra.append(f"{it['wpm']} wpm")
            if key == "music":
                extra.append(f"fade {it['fade_in']:.1f}/{it['fade_out']:.1f}s" + ("" if it["duck"] else ", not ducked"))
            if it.get("note"):
                extra.append(it["note"])
            L.append(f"| {it['id']} | {key} | {tc(it['start'])} to {tc(it['end'])} | {Path(it['source']).name} | "
                     f"{it['gain_db']:+.1f} dB | {'; '.join(extra)} |")
    L.append("")
    if tl["titles"]:
        L.append("## On-screen text\n")
        L.append("| Id | Program in to out | Style | Text |")
        L.append("|---|---|---|---|")
        for t in tl["titles"]:
            L.append(f"| {t['id']} | {tc(t['start'])} to {tc(t['end'])} | {t['style']} | {t['text'].replace(chr(10), ' / ')} |")
        L.append("")
    cap = tl["captions"]
    L.append("## Captions\n")
    L.append(f"- File: `{cap.get('file', 'none')}` · mode: {cap.get('mode', 'none')} · language: {cap.get('language', '-')}\n")
    L.append("## Disclosure and accuracy flags\n")
    if disclose:
        for c in disclose:
            L.append(f"- {c['id']} ({tc(c['start'])}): **{c['label']}**. {c.get('description') or ''} "
                     "Make sure narration or on-screen text does not present it as the actual event.")
    else:
        L.append("- No shots are labelled illustrative, reenactment or AI-generated.")
    L.append("\n## Credits and attributions\n")
    if credits:
        for r in credits:
            line = r.get("attribution") or (f"{r.get('title') or r.get('file')} - {r.get('creator') or 'unknown'}, "
                                            f"{r.get('source_archive') or ''}, {r.get('license') or ''}")
            L.append(f"- {line}" + (f" ({r['license_url']})" if r.get("license_url") and r["license_url"] not in line else ""))
    else:
        L.append("- No attributions recorded in the asset log.")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text("\n".join(L) + "\n", encoding="utf-8")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("timeline")
    ap.add_argument("--assets", help="asset log CSV (default: asset_log.csv next to the timeline)")
    ap.add_argument("--report", help="write the edit plan Markdown here")
    ap.add_argument("--json", help="write the fully resolved timeline (program timings) as JSON")
    ap.add_argument("--commercial", action="store_true", help="treat NC licences as errors")
    ap.add_argument("--no-probe", action="store_true", help="skip ffprobe (structure check only)")
    args = ap.parse_args(argv)
    try:
        tl = V.resolve_timeline(args.timeline, probe=not args.no_probe and bool(V.which("ffprobe")))
    except V.TimelineError as exc:
        print(f"ERROR: {exc}")
        return 1
    asset_path = Path(args.assets) if args.assets else Path(tl["base_dir"]) / "asset_log.csv"
    rows = V.read_asset_log(asset_path) if asset_path.exists() else None
    errors, warnings, info, credits, disclose, _ = analyse(tl, rows, args.commercial)
    fps = tl["output"]["fps"]
    print(f"{tl['title']}: {len(tl['clips'])} clips, running time {V.timecode(tl['total_seconds'], fps)} "
          f"({tl['total_seconds']:.2f}s) at {V.fps_str(fps)} fps")
    for e in errors:
        print(f"  ERROR  {e}")
    for w in warnings:
        print(f"  WARN   {w}")
    for i in info:
        print(f"  note   {i}")
    if args.report:
        write_report(tl, args.report, errors, warnings, info, credits, disclose)
        print(f"Edit plan written to {args.report}")
    if args.json:
        slim = {k: v for k, v in tl.items() if k != "raw"}
        Path(args.json).write_text(json.dumps(slim, indent=2, default=str), encoding="utf-8")
        print(f"Resolved timeline written to {args.json}")
    print("RESULT: " + ("NOT RENDERABLE (fix errors)" if errors else "renderable"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
