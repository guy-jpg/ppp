#!/usr/bin/env python3
"""Create, check, fix and convert subtitle / caption files (SRT and WebVTT).

Subcommands
  from-timeline TIMELINE --out captions/en.srt
      Build captions from the `text` of every narration item in a timeline.
      Text is split into readable cues (line length, two lines max, natural
      line breaks) and timed across the narration's real speech span; cue
      boundaries snap to pauses detected in the recording. Timing is an
      approximation of forced alignment: always spot-check, and prefer ASR
      word timings (e.g. whisper) when they are available, then run `fix`.
  from-text FILE --start S --end E --out x.srt
      Spread a plain-text script (one paragraph per line) evenly over a span.
  lint FILE            Report readability / timing problems (exit 1 on errors).
  fix FILE --out OUT   Re-chunk over-long cues, enforce min gap / durations.
  convert IN OUT       SRT <-> VTT by file extension.
  shift IN --by SEC --out OUT

Profiles (--profile): streaming (default: 42 chars x 2 lines, 17 cps),
broadcast (37 x 2, 15 cps), social (26 x 2, 17 cps, short cues for vertical video).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vidlib as V  # noqa: E402

PROFILES = {
    "streaming": dict(max_chars=42, max_lines=2, max_cps=17.0, min_dur=0.833, max_dur=7.0, min_gap=0.083),
    "broadcast": dict(max_chars=37, max_lines=2, max_cps=15.0, min_dur=1.0, max_dur=6.0, min_gap=0.12),
    "social": dict(max_chars=26, max_lines=2, max_cps=17.0, min_dur=0.7, max_dur=3.5, min_gap=0.05),
}
NO_LINE_END = {"a", "an", "the", "of", "to", "in", "on", "at", "for", "with", "by", "from", "and", "or",
               "but", "nor", "as", "that", "which", "who", "my", "your", "his", "her", "its", "our",
               "their", "this", "these", "those", "is", "was", "were", "be", "mr.", "mrs.", "dr.", "st."}


# ------------------------------------------------------------------ parsing
def _ts(s: str) -> float:
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    if len(parts) == 2:
        parts = ["0"] + parts
    h, m, sec = parts
    return int(h) * 3600 + int(m) * 60 + float(sec)


def read_cues(path) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8-sig", errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    cues = []
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [l for l in block.split("\n")]
        idx = next((i for i, l in enumerate(lines) if "-->" in l), None)
        if idx is None:
            continue
        m = re.match(r"\s*([\d:.,]+)\s*-->\s*([\d:.,]+)", lines[idx])
        if not m:
            continue
        body = "\n".join(l.strip() for l in lines[idx + 1:] if l.strip())
        cues.append({"start": _ts(m.group(1)), "end": _ts(m.group(2)), "text": body})
    return cues


def _fmt(t: float, sep: str) -> str:
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def write_srt(cues, path) -> None:
    out = []
    for i, c in enumerate(cues, 1):
        out.append(f"{i}\n{_fmt(c['start'], ',')} --> {_fmt(c['end'], ',')}\n{c['text']}\n")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text("\n".join(out), encoding="utf-8")


def write_vtt(cues, path) -> None:
    out = ["WEBVTT", ""]
    for c in cues:
        out.append(f"{_fmt(c['start'], '.')} --> {_fmt(c['end'], '.')}\n{c['text']}\n")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text("\n".join(out), encoding="utf-8")


def write_cues(cues, path) -> None:
    (write_vtt if str(path).lower().endswith(".vtt") else write_srt)(cues, path)


# ----------------------------------------------------------------- chunking
def line_break(text: str, max_chars: int, max_lines: int = 2) -> str | None:
    """Break one caption into <= max_lines lines of <= max_chars, at the most natural point."""
    text = " ".join(text.split())
    if len(text) <= max_chars:
        return text
    if max_lines < 2:
        return None
    words = text.split(" ")
    best, best_score = None, None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if len(a) > max_chars:
            break
        if len(b) > max_chars:
            if max_lines > 2:
                rest = line_break(b, max_chars, max_lines - 1)
                if rest is None:
                    continue
                b = rest
            else:
                continue
        last = words[i - 1].lower()
        score = abs(len(a) - len(b.split("\n")[0]))
        if re.search(r"[,;:.!?—-]$", last):
            score -= 14
        if last.strip("\"'(") in NO_LINE_END:
            score += 18
        if len(a) > len(b.split("\n")[0]):
            score += 2  # prefer a bottom-heavy (pyramid) shape
        if best_score is None or score < best_score:
            best, best_score = f"{a}\n{b}", score
    return best


def split_sentences(text: str) -> list[str]:
    text = " ".join(text.split())
    if not text:
        return []
    parts = re.split(r"(?<=[.!?…])[\"')\]]*\s+(?=[\"'(\[]?[A-Z0-9À-ɏ])", text)
    return [p.strip() for p in parts if p.strip()]


SPLIT_BEFORE = {"and", "but", "or", "so", "yet", "than", "that", "which", "who", "whom", "whose", "when",
                "while", "where", "because", "although", "though", "until", "unless", "after", "before",
                "since", "if", "as", "to"}


def split_long(sentence: str, max_chars: int, max_lines: int) -> list[str]:
    """Recursively bisect a sentence that will not fit one cue, at the most natural point."""
    if line_break(sentence, max_chars, max_lines):
        return [sentence]
    words = sentence.split(" ")
    if len(words) < 2:
        return [sentence]
    best, best_score = None, None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if min(len(a), len(b)) < 12 and len(words) > 3:
            continue
        score = abs(len(a) - len(b))
        last, nxt = words[i - 1], words[i].lower().strip("\"'(")
        if re.search(r"[;:—]$", last) or last.endswith("--"):
            score -= 45
        elif last.endswith(","):
            score -= 30
        if nxt in SPLIT_BEFORE:
            score -= 12
        if last.lower().strip("\"'(") in NO_LINE_END:
            score += 30
        if best_score is None or score < best_score:
            best, best_score = i, score
    if best is None:
        best = len(words) // 2
    return (split_long(" ".join(words[:best]), max_chars, max_lines) +
            split_long(" ".join(words[best:]), max_chars, max_lines))


def chunk_text(text: str, max_chars: int = 42, max_lines: int = 2) -> list[str]:
    cap = max_chars * max_lines
    chunks: list[str] = []
    for sentence in split_sentences(text):
        chunks.extend(split_long(sentence, max_chars, max_lines))
    # merge a very short chunk into the following one when both fit together
    merged: list[str] = []
    for c in chunks:
        if merged and len(merged[-1]) < cap / 4 and line_break(merged[-1] + " " + c, max_chars, max_lines):
            merged[-1] = merged[-1] + " " + c
        else:
            merged.append(c)
    return [line_break(c, max_chars, max_lines) or c for c in merged]


def distribute(chunks: list[str], start: float, end: float, rules: dict, pauses=None) -> list[dict]:
    """Time chunks proportionally to their length across [start, end]; snap boundaries to pauses."""
    if not chunks:
        return []
    span = max(0.1, end - start)
    weights = [len(c.replace("\n", " ")) + 6 for c in chunks]
    total_w = float(sum(weights))
    bounds = [start]
    acc = start
    for w in weights:
        acc += span * w / total_w
        bounds.append(acc)
    bounds[-1] = end
    pauses = pauses or []
    for i in range(1, len(bounds) - 1):
        best = None
        for p0, p1 in pauses:
            mid = (p0 + p1) / 2
            if abs(mid - bounds[i]) <= 0.7 and bounds[i - 1] + rules["min_dur"] < mid < bounds[i + 1] - rules["min_dur"]:
                if best is None or abs(mid - bounds[i]) < abs(best - bounds[i]):
                    best = mid
        if best is not None:
            bounds[i] = best
    cues = []
    gap = rules["min_gap"]
    for i, c in enumerate(chunks):
        s, e = bounds[i], bounds[i + 1]
        if i < len(chunks) - 1:
            e -= gap
        cues.append({"start": round(s, 3), "end": round(max(s + 0.2, e), 3), "text": c})
    return cues


def speech_span(src: str, src_in: float, dur: float):
    """Detect leading/trailing silence and internal pauses in a narration file (offsets from src_in)."""
    if not V.which("ffmpeg"):
        return 0.0, dur, []
    proc = V.run(["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-ss", f"{src_in:.3f}", "-t", f"{dur:.3f}",
                  "-i", src, "-af", "silencedetect=n=-35dB:d=0.25", "-f", "null", "-"], check=False)
    sil, open_s = [], None
    for line in (proc.stderr or "").splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            open_s = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and open_s is not None:
            sil.append((open_s, float(m.group(1))))
            open_s = None
    if open_s is not None:
        sil.append((open_s, dur))
    s0, s1 = 0.0, dur
    inner = []
    for a, b in sil:
        if a <= 0.05:
            s0 = min(b, dur)
        elif b >= dur - 0.05:
            s1 = max(s0, a)
        else:
            inner.append((a, b))
    if s1 - s0 < 0.3:
        return 0.0, dur, []
    return s0, s1, inner


# -------------------------------------------------------------------- lint
def lint(cues, rules) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    prev_end = None
    for i, c in enumerate(cues, 1):
        tag = f"cue {i} ({_fmt(c['start'], '.')})"
        lines = c["text"].split("\n") if c["text"] else []
        dur = c["end"] - c["start"]
        plain = " ".join(l.strip() for l in lines)
        plain_no_tags = re.sub(r"<[^>]+>|\{[^}]+\}", "", plain)
        if not plain_no_tags.strip():
            errors.append(f"{tag}: empty text")
        if dur <= 0:
            errors.append(f"{tag}: ends before it starts")
            continue
        if len(lines) > rules["max_lines"]:
            errors.append(f"{tag}: {len(lines)} lines (max {rules['max_lines']})")
        for l in lines:
            if len(re.sub(r"<[^>]+>", "", l)) > rules["max_chars"]:
                warnings.append(f"{tag}: line has {len(l)} characters (max {rules['max_chars']}): {l[:50]!r}")
        cps = len(plain_no_tags) / dur
        if cps > rules["max_cps"] + 3:
            errors.append(f"{tag}: {cps:.1f} characters/second is too fast to read (max {rules['max_cps']})")
        elif cps > rules["max_cps"]:
            warnings.append(f"{tag}: {cps:.1f} characters/second (target <= {rules['max_cps']})")
        if dur < rules["min_dur"]:
            warnings.append(f"{tag}: on screen {dur:.2f}s (min {rules['min_dur']})")
        if dur > rules["max_dur"]:
            warnings.append(f"{tag}: on screen {dur:.2f}s (max {rules['max_dur']})")
        if prev_end is not None:
            if c["start"] < prev_end - 1e-3:
                errors.append(f"{tag}: overlaps the previous cue by {prev_end - c['start']:.3f}s")
            elif c["start"] - prev_end < rules["min_gap"] - 1e-3 and c["start"] - prev_end > 1e-3:
                warnings.append(f"{tag}: gap {c['start'] - prev_end:.3f}s is below {rules['min_gap']}s")
        prev_end = c["end"]
    return errors, warnings


def fix(cues, rules) -> list[dict]:
    out = []
    for c in sorted(cues, key=lambda x: x["start"]):
        plain = " ".join(c["text"].split())
        dur = c["end"] - c["start"]
        chunks = chunk_text(plain, rules["max_chars"], rules["max_lines"])
        n_by_time = max(1, int(dur // rules["max_dur"]) + (1 if dur % rules["max_dur"] > 0.01 else 0))
        if len(chunks) == 1 and n_by_time > 1 and len(plain.split()) >= 2 * n_by_time:
            words = plain.split()
            per = -(-len(words) // n_by_time)
            chunks = [line_break(" ".join(words[k:k + per]), rules["max_chars"], rules["max_lines"]) or
                      " ".join(words[k:k + per]) for k in range(0, len(words), per)]
        out.extend(distribute(chunks, c["start"], c["end"], rules) if len(chunks) > 1 else
                   [{"start": c["start"], "end": c["end"], "text": chunks[0] if chunks else c["text"]}])
    for i in range(len(out) - 1):
        a, b = out[i], out[i + 1]
        if a["end"] > b["start"] - rules["min_gap"]:
            a["end"] = round(max(a["start"] + 0.2, b["start"] - rules["min_gap"]), 3)
        if a["end"] - a["start"] < rules["min_dur"]:
            a["end"] = round(min(a["start"] + rules["min_dur"], b["start"] - rules["min_gap"]), 3)
    return out


# ---------------------------------------------------------------- commands
def cmd_from_timeline(args, rules):
    tl = V.resolve_timeline(args.timeline)
    errs = [e for e in tl["errors"] if not e.startswith("captions file not found")]
    if errs:
        print("Timeline errors (captions may be incomplete):")
        for e in errs:
            print(f"  ERROR  {e}")
    cues, skipped = [], []
    for n in tl["narration"]:
        if not n.get("text"):
            skipped.append(n["id"])
            continue
        s0, s1, pauses = (0.0, n["duration"], [])
        if not args.no_detect and Path(n["source"]).exists():
            s0, s1, pauses = speech_span(n["source"], n["in"], n["duration"])
        base = n["start"]
        chunks = chunk_text(n["text"], rules["max_chars"], rules["max_lines"])
        cues.extend(distribute(chunks, base + s0, base + s1, rules, [(base + a, base + b) for a, b in pauses]))
    cues.sort(key=lambda c: c["start"])
    total = tl["total_seconds"]
    cues = [c for c in cues if c["start"] < total]
    for c in cues:
        c["end"] = min(c["end"], total)
    if not cues:
        print("No narration text found: add a `text` field to narration items, or transcribe the audio.")
        return 1
    write_cues(cues, args.out)
    errors, warnings = lint(cues, rules)
    print(f"Wrote {len(cues)} cues to {args.out} (timing approximated from narration; spot-check against the audio).")
    if skipped:
        print(f"  narration without text (no captions made): {', '.join(skipped)}")
    for e in errors:
        print(f"  ERROR  {e}")
    for w in warnings[:20]:
        print(f"  WARN   {w}")
    if args.vtt:
        vtt = str(Path(args.out).with_suffix(".vtt"))
        write_vtt(cues, vtt)
        print(f"Wrote {vtt}")
    return 0


def cmd_from_text(args, rules):
    text = Path(args.file).read_text(encoding="utf-8")
    paras = [p.strip() for p in text.split("\n") if p.strip()]
    start = V.parse_time(args.start) or 0.0
    end = V.parse_time(args.end) if args.end else start + V.parse_time(args.duration)
    chunks = [c for p in paras for c in chunk_text(p, rules["max_chars"], rules["max_lines"])]
    cues = distribute(chunks, start, end, rules)
    write_cues(cues, args.out)
    errors, warnings = lint(cues, rules)
    print(f"Wrote {len(cues)} cues to {args.out}")
    for e in errors:
        print(f"  ERROR  {e}")
    for w in warnings[:20]:
        print(f"  WARN   {w}")
    return 0


def cmd_lint(args, rules):
    cues = read_cues(args.file)
    errors, warnings = lint(cues, rules)
    print(f"{args.file}: {len(cues)} cues, {len(errors)} errors, {len(warnings)} warnings")
    for e in errors:
        print(f"  ERROR  {e}")
    for w in warnings:
        print(f"  WARN   {w}")
    return 1 if errors else 0


def cmd_fix(args, rules):
    cues = fix(read_cues(args.file), rules)
    write_cues(cues, args.out)
    errors, warnings = lint(cues, rules)
    print(f"Wrote {len(cues)} cues to {args.out}: {len(errors)} errors, {len(warnings)} warnings remain")
    for e in errors:
        print(f"  ERROR  {e}")
    return 1 if errors else 0


def cmd_convert(args, rules):
    cues = read_cues(args.src)
    write_cues(cues, args.dst)
    print(f"Converted {len(cues)} cues: {args.src} -> {args.dst}")
    return 0


def cmd_shift(args, rules):
    by = float(args.by)
    cues = [{"start": max(0.0, c["start"] + by), "end": max(0.0, c["end"] + by), "text": c["text"]}
            for c in read_cues(args.src)]
    write_cues([c for c in cues if c["end"] > c["start"]], args.out)
    print(f"Shifted {len(cues)} cues by {by:+.3f}s -> {args.out}")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--profile", choices=PROFILES, default="streaming")
    for k in ("max_chars", "max_lines"):
        ap.add_argument("--" + k.replace("_", "-"), type=int)
    for k in ("max_cps", "min_dur", "max_dur", "min_gap"):
        ap.add_argument("--" + k.replace("_", "-"), type=float)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("from-timeline")
    p.add_argument("timeline")
    p.add_argument("--out", required=True)
    p.add_argument("--vtt", action="store_true", help="also write a .vtt next to the .srt")
    p.add_argument("--no-detect", action="store_true", help="do not analyse narration audio for pauses")
    p = sub.add_parser("from-text")
    p.add_argument("file")
    p.add_argument("--start", default="0")
    p.add_argument("--end")
    p.add_argument("--duration")
    p.add_argument("--out", required=True)
    p = sub.add_parser("lint")
    p.add_argument("file")
    p = sub.add_parser("fix")
    p.add_argument("file")
    p.add_argument("--out", required=True)
    p = sub.add_parser("convert")
    p.add_argument("src")
    p.add_argument("dst")
    p = sub.add_parser("shift")
    p.add_argument("src")
    p.add_argument("--by", required=True)
    p.add_argument("--out", required=True)
    args = ap.parse_args(argv)
    rules = dict(PROFILES[args.profile])
    for k in rules:
        if getattr(args, k, None) is not None:
            rules[k] = getattr(args, k)
    if args.cmd == "from-text" and not (args.end or args.duration):
        ap.error("from-text needs --end or --duration")
    return {"from-timeline": cmd_from_timeline, "from-text": cmd_from_text, "lint": cmd_lint, "fix": cmd_fix,
            "convert": cmd_convert, "shift": cmd_shift}[args.cmd](args, rules)


if __name__ == "__main__":
    sys.exit(main())
