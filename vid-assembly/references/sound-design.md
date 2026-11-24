# Sound: narration, music, sound effects and the mix

Read this when planning or sourcing narration, music or sound effects, or tuning the mix.
Audiences forgive rough pictures far more readily than bad sound. Good sound is half the film.

## Contents
1. Layers of a soundtrack
2. Narration: sources, recording, cleanup, synthetic voices
3. Music: choosing, editing, licensing
4. Sound effects and ambience
5. Mix levels
6. Loudness targets by platform
7. How the renderer mixes (and how to steer it)

---

## 1. Layers of a soundtrack

| Layer | Role | Timeline home |
|---|---|---|
| Narration / dialogue | The anchor: everything else makes room for it | `narration` |
| Natural sound (actuality) | The clip's own sound: crowds, engines, speeches | clip `audio`, `audio_gain_db` |
| Music | Emotion, pace, structure (acts) | `music` |
| Sound effects | Impact, emphasis, life in silent footage | `sfx` |
| Ambience / room tone | Continuity; prevents dead digital silence | `sfx` (long, low) or `music` with `duck: true` |

## 2. Narration

**Order of preference**
1. The user's own recording or a voice actor they supply.
2. A recording the user makes from your script (give them the script and the recording tips below).
3. Synthetic speech (TTS), only with the user's agreement. Label it "synthetic narration" in the
   plan and credits. Use it freely as **scratch narration** to time the edit, and say clearly
   that it is a placeholder.
Never imitate or clone a real person's voice without their documented consent.

**Scratch TTS commands** (only if `check_env.py` found the tool):
```bash
espeak-ng -v en-us -s 150 -w audio/narration/vo01.wav "Text of the line."
piper --model en_US-lessac-medium.onnx --output_file audio/narration/vo01.wav < script/vo01.txt
say -v Samantha -r 160 -o audio/narration/vo01.aiff "Text of the line."   # macOS
```

**Recording tips for the user**: a quiet, soft-furnished room (a closet of clothes is excellent);
the mic 15-20 cm away, slightly off-axis to avoid plosives; record WAV at 48 kHz/24-bit with
peaks around -12 dBFS; one file per narration item; leave 1 s of silence at the start (room tone);
read standing, at a conversational pace, and redo any line with a stumble rather than patching it.

**Cleanup chain** (run per file before editing, only when needed; listen afterwards):
```bash
ffmpeg -i raw/vo01.wav -af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,deesser" -ar 48000 audio/narration/vo01.wav
```
`highpass` removes rumble, `afftdn` reduces steady noise (too much sounds watery), `acompressor`
evens out the level, `deesser` softens harsh "s" sounds. Don't loudness-normalise here: the
renderer does it.

**Timing**: one narration item per thought or paragraph, anchored with `at_clip` to the shot it
belongs to and an `offset` of 0.3-0.5 s. Put the exact words in `text` for captions and pacing checks.

## 3. Music

**Choosing**
- Choose by emotional arc, not genre: what should the viewer feel in this act?
- One musical idea per act; change music (or let it drop out) at act breaks.
- Instrumental under narration. Lyrics fight the voice; save vocal tracks for montages without
  narration.
- Silence is a tool: dropping the music before a revelation makes the revelation louder.
- Period music can place a story in time. Remember that a public-domain composition can still
  have a copyrighted recording (see `rights-clearance.md`).

**Editing music to picture**
- Start on a downbeat or at a phrase start; end on the track's natural ending (a "button"),
  ideally landing on the final image. A mid-phrase fade-out sounds like the film ran out of time.
- To fit a length, cut out whole bars or phrases rather than fading: find two matching downbeats
  and join them (use the `in`/`out` of two music items with a 0.05 s crossfade via `fade_in`/`fade_out`).
- To end on time, back-time the music: place the ending so it finishes with the picture
  (`start = program_end - (out - in)`), and fade the earlier, unimportant part in.
- Bring music up (`gain_db` 0 to -3) in moments without narration (openings, montages, endings),
  and let ducking handle the passages under narration.

**Where to get music**: see `archival-sources.md` (music and SFX section). Commercial songs need a
sync licence from the publisher **and** a master-use licence from the label. Buying or streaming
a song grants neither, and a few seconds is not automatically "fair use". On YouTube, Content ID
will claim, monetise or block such uses.

## 4. Sound effects and ambience

- Silent archival footage feels dead. Subtle, plausible sound (wind, crowd murmur, machinery,
  footsteps, a projector hum for a newsreel feel) brings it to life. Keep it low (-12 to -24 dB)
  and sparse.
- It is sound design, not a historical recording: never imply that added sound was captured at
  the event. Use restraint with atrocity, war and disaster footage; silence can be more respectful.
- Hits and whooshes emphasise titles and transitions in energetic pieces; a few are plenty.
  Anchor them with `at_clip` and a small negative offset (-0.2 to -0.4 s) so they peak on the cut.
- Room tone or a low ambience bed under narration-only passages prevents the "dropout" feeling of
  digital silence. `validate_timeline.py` warns about stretches with no sound at all.

## 5. Mix levels

Relative to the narration reference (narration and music items are normalised to
`mix.reference_lufs` first, so these numbers mean the same thing in every project):

| Element | `gain_db` | Effective level under narration |
|---|---|---|
| Narration | 0 | reference |
| Music bed (ducked by 10 dB under narration) | -6 (default) | about -16 |
| Music alone (opening, montage, ending) | -3 to 0 | - |
| Natural sound under narration | clip `audio_gain_db` -12 to -18 (also ducked) | about -22 to -28 |
| Natural sound as a feature (a speech, a crowd) | 0 to -6 | - |
| SFX accents | -6 to -12 | - |
| Ambience beds | -18 to -24 | - |

If narration sounds buried on small speakers, lower the music by 3 dB rather than raising narration.

## 6. Loudness targets by platform

| Destination | Integrated loudness | True peak | Preset |
|---|---|---|---|
| YouTube, Vimeo, most streaming and social platforms | -14 LUFS | -1 dBTP | youtube-1080p, vertical, square, web |
| Podcast / mobile-first audio | -16 LUFS | -1 dBTP | (set `output.loudness`) |
| European broadcast (EBU R128) | -23 LUFS +/- 0.5 | -1 dBTP | broadcast-hd-ebu |
| US broadcast (ATSC A/85) | -24 LKFS +/- 2 | -2 dBTP | broadcast-hd-atsc |
| Cinema/archival master | keep dynamics; -16 to -23 | -1 dBTP | prores-master |

Broadcasters publish their own delivery specs; when one is provided, it overrides this table.
Platforms turn loud uploads down but rarely turn quiet ones up, so a quiet mix just sounds weak.

## 7. How the renderer mixes

1. Each clip's own sound is conformed with the picture; transitions crossfade it (equal power for
   dissolves).
2. Each narration and music item is measured and normalised to `mix.reference_lufs` (default
   -18), then `gain_db`, fades and placement are applied.
3. Music and clip sound are ducked under narration by `ducking.amount_db` (default 10 dB, about
   20 ms attack and 500 ms release, so short pauses between sentences don't pump).
4. All buses are summed in floating point (no clipping), and the result is measured and
   normalised in two passes to the output loudness target with a true-peak ceiling.
5. QC measures the finished file again and reports integrated loudness and true peak.

To steer it: lower `music[].gain_db` for a quieter bed, raise `ducking.amount_db` (max about 13)
for clearer narration, set `ducking.targets` to `["music"]` to leave natural sound un-ducked, or
set `normalize_sources: false` to use the files' own levels.
