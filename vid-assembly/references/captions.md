# Captions and subtitles

Read this when making, timing, styling or delivering captions. Captions are part of every
delivery unless the user declines: they serve deaf and hard-of-hearing viewers, people watching
with the sound off, and non-native speakers, and they make the content searchable.

## Contents
1. Terms and delivery choices
2. Readability standards
3. Line breaking
4. Timing
5. SDH conventions
6. Workflow with the scripts
7. Burned-in styling
8. Translation

---

## 1. Terms and delivery choices

- **Closed captions** can be turned on and off: a sidecar file (`.srt`, `.vtt`) uploaded beside
  the video, or a soft track inside the file (`mov_text` in MP4).
- **Open captions** are burned into the picture and always visible.
- **Subtitles** translate dialogue for viewers who can hear; **SDH** (subtitles for the deaf and
  hard of hearing) add speaker IDs and sound descriptions.

| Destination | Deliver |
|---|---|
| YouTube, Vimeo, LMS, web players | Sidecar SRT/VTT uploaded with the video (`mode: sidecar`); viewers can switch them off and they are searchable |
| Instagram, TikTok, Shorts, LinkedIn/X feeds | Burned in (`mode: burn`), styled for small screens, and the sidecar as well where the platform accepts it |
| Files played in local players / sent to clients | Soft track (`mode: soft`) plus sidecar |
| Broadcast | Follow the broadcaster's spec (often SCC, EBU-TT or an embedded format produced by a captioning tool); supply the SRT as the source text |

Keep a version without burned-in captions (and without burned-in text where possible) for
translations and future re-edits.

## 2. Readability standards

| Rule | Streaming (default) | Broadcast | Social / vertical |
|---|---|---|---|
| Max characters per line | 42 | 37 | 26-32 |
| Max lines | 2 | 2 | 2 (one is often better) |
| Reading speed | <= 17 characters/s (up to 20 for adult content) | <= 15 cps | <= 17 cps |
| Min duration | 0.83 s (5/6 s) | 1 s | 0.7 s |
| Max duration | 7 s | 6 s | 3.5 s |
| Min gap between cues | 2 frames (about 0.083 s at 24 fps) | 3 frames | 0.05 s |

`make_captions.py --profile streaming|broadcast|social` applies these.

## 3. Line breaking

Break at the natural linguistic boundary, preferring (best first):
1. after punctuation (end of a clause);
2. before a conjunction or preposition (and, but, because, to, of...);
3. near the middle, with the bottom line slightly longer (a "pyramid").

Never break between an article or adjective and its noun, inside a name, or between a verb and
its particle. Never end a line on "the", "a", "of", "to" and similar words.

Good:
```
In the spring of 1961,
a small team of engineers set out
```
Bad:
```
In the spring of 1961, a small team of
engineers set out
```

## 4. Timing

- A cue starts when the speech starts (within a frame or two) and ends when it ends, plus up to
  0.5 s of linger when there is room.
- Don't let a cue straddle a shot change when it can be avoided: if a cue boundary falls within
  about half a second of a cut, move it to the cut.
- Keep cues for one speaker's thought together; start a new cue for a new speaker.
- Text should be verbatim. Light trimming of false starts and fillers is acceptable; changing
  meaning is not.
- Proper nouns, numbers and dates come from the research notes, not from speech recognition.

## 5. SDH conventions

- Sound descriptions in square brackets, lowercase, concise: `[crowd cheering]`, `[radio static]`,
  `[music swells]`, `[silence]`.
- Music: `[ominous music]` for instrumental; lyrics between music notes `♪ words ♪`.
- Off-screen or unclear speakers: `NARRATOR:` or `[Kennedy]` before the line.
- Foreign language: `[speaking Russian]`, or a translated subtitle in italics where supported.

## 6. Workflow with the scripts

**From narration text in the timeline** (the default path; text is exact, timing approximate):
```bash
python scripts/make_captions.py from-timeline timeline.json --out captions/en.srt --vtt
python scripts/make_captions.py lint captions/en.srt
```
The script splits the text into readable cues, measures where speech actually starts and stops
in each narration file, and snaps cue boundaries to detected pauses. Spot-check the timing in the
preview render, especially long narration items.

**With speech recognition available** (`check_env.py` lists whisper/faster-whisper):
```bash
whisper audio/narration/vo01.wav --model small --language en --output_format srt --output_dir captions/asr
```
Use ASR timing but correct the words against the script (ASR misspells names), then shift each
item's cues to its program position (`make_captions.py shift --by <start>`), merge, and run
`make_captions.py fix` and `lint`.

**For clip dialogue** (interviews, archival speeches): transcribe with ASR if available, or ask the
user for a transcript; mark uncertain words `[inaudible]` rather than guessing.

**Fixing problems**: `make_captions.py fix in.srt --out out.srt` re-splits overlong cues, enforces
gaps and minimum durations. If reading speed is still too high, the narration is too dense for its
length: edit the script or lengthen the shot. Don't just shrink the font.

## 7. Burned-in styling

- Sans-serif, white with a black outline or a soft box, bottom centre, inside title-safe.
- Landscape defaults: `size` 14, `margin_v` 18 (libass units relative to a 288-line canvas).
- Vertical defaults: `size` 10, bold, `margin_v` 70, which places captions above the bottom
  platform UI.
- Don't let captions collide with lower thirds: move the lower third, or raise `margin_v` for that
  stretch by splitting the captions, or skip the lower third while dialogue runs.
- Check legibility on the contact sheet at phone size.

## 8. Translation

Translate from the final, locked caption file so timing is preserved; keep one file per language
(`captions/es.srt`, ISO 639-2 language code in `captions.language` for soft tracks). Expect
other languages to run 10-30 % longer than English and to need more splitting
(`make_captions.py fix --profile ...`). Machine translation of narration is a draft: have a fluent
speaker review it before publishing, and say so in the delivery notes.
