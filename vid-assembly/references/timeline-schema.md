# timeline.json reference

`timeline.json` is the single source of truth for an edit. `validate_timeline.py` checks it,
`make_captions.py` reads its narration, and `render.py` turns it into a video. All paths are
relative to the folder that contains the timeline.

## Contents
1. Time values and program timing
2. Top level
3. `output`
4. `clips` (the picture track)
5. `narration`, `music`, `sfx` (audio items)
6. `titles` (text over picture)
7. `captions`
8. `mix`
9. Full example

---

## 1. Time values and program timing

Any time field accepts: `12.5` · `"12.5"` · `"01:02.5"` (MM:SS) · `"00:01:02.500"` (HH:MM:SS) ·
`"00:01:02:12"` (HH:MM:SS:FF, frames at the output frame rate).

- Clip durations are snapped to whole frames at the output fps.
- **Program time** is the running time of the finished video. Clips play one after another; a
  transition on clip *N* overlaps it with clip *N-1* by the transition's duration, so every
  transition shortens the program by its own length.
- `validate_timeline.py --json resolved.json` writes each clip's program `start`/`end`, which is
  what audio anchors and captions use.

## 2. Top level

| Key | Type | Notes |
|---|---|---|
| `schema` | string | `"vid-assembly/timeline@1"` |
| `title` | string | Used in metadata, reports and the default output name |
| `output` | object | Delivery settings (section 3) |
| `clips` | array | Picture track, in order (required) |
| `narration`, `music`, `sfx` | arrays | Audio items (section 5) |
| `titles` | array | Lower thirds, captions-style text, labels (section 6) |
| `captions` | object | Caption file and how to deliver it (section 7) |
| `mix` | object | Normalisation, ducking and bus gains (section 8) |

## 3. `output`

Start from a preset and override only what you must.

| Preset | Raster | fps | Codec / container | Fit | Loudness |
|---|---|---|---|---|---|
| `youtube-1080p` (default) | 1920x1080 | 24 | H.264 CRF 18 / MP4 | pad | -14 LUFS, -1 dBTP |
| `youtube-4k` | 3840x2160 | 24 | H.264 CRF 17 / MP4 | pad | -14 LUFS |
| `web-720p` | 1280x720 | 24 | H.264 CRF 21 / MP4 | pad | -14 LUFS |
| `vertical-1080x1920` | 1080x1920 | 30 | H.264 / MP4 | blur | -14 LUFS |
| `square-1080` | 1080x1080 | 30 | H.264 / MP4 | blur | -14 LUFS |
| `broadcast-hd-ebu` | 1920x1080 | 25 | ProRes 422 HQ, PCM 24-bit / MOV | pad | -23 LUFS, -1 dBTP |
| `broadcast-hd-atsc` | 1920x1080 | 29.97 | ProRes 422 HQ, PCM 24-bit / MOV | pad | -24 LKFS, -2 dBTP |
| `prores-master` | 1920x1080 | 24 | ProRes 422 HQ, PCM 24-bit / MOV | pad | -16 LUFS |

| Key | Notes |
|---|---|
| `preset` | One of the above |
| `path` | Output file, e.g. `exports/title_v1.mp4`. The extension must suit the codec (ProRes -> `.mov`) |
| `width`, `height` | Even numbers |
| `fps` | `24`, `25`, `30`, `"30000/1001"` or `29.97`, `"24000/1001"`, `50`, `60` |
| `fit` | Default fit for clips: `pad` (letter/pillarbox), `crop` (fill), `blur` (blurred fill). Stretching is not offered |
| `background` | Pad and title-card colour (`black`, `#101010`, ...) |
| `video_codec` | `libx264`, `libx265`, `prores_ks`, `libvpx-vp9` |
| `crf`, `x264_preset` | Quality and speed for x264/x265 |
| `pix_fmt` | `yuv420p` (web) or `yuv422p10le` (ProRes) |
| `prores_profile` | 0 proxy, 1 LT, 2 standard, 3 HQ, 4 4444 |
| `audio_codec`, `audio_bitrate`, `sample_rate` | `aac`/`pcm_s24le`/`libopus`; e.g. `320k`; `48000` |
| `loudness` | `{"target_lufs": -14, "true_peak": -1.0, "lra": 11}` or `null` to skip normalisation (a -1 dBFS limiter still applies) |

## 4. `clips`

Each clip is one shot on the picture track.

| Key | Applies to | Notes |
|---|---|---|
| `id` | all | Unique, e.g. `S03-02` (scene 3, shot 2). Used by anchors and reports |
| `scene` | all | Scene id for grouping in the edit plan and `at_scene` anchors |
| `type` | all | `video`, `image`, `color`, `title`. Inferred from `source`/`text` if omitted |
| `source` | video, image | Media path |
| `asset_id` | video, image | Row in `asset_log.csv` (otherwise matched by file path) |
| `in`, `out` | video | Source in/out points. `out` defaults to end of file |
| `duration` | all | Image/colour/title length (defaults 5 s / 3 s / 3 s); for video it overrides `out` |
| `speed` | video | 0.25-4 typical (`0.8` slows silent-era footage). Audio is time-stretched to match |
| `freeze` | video | `true` holds the frame at `in` for `duration` (supports `motion`) |
| `fit` | video, image | `pad`, `crop` or `blur`. Stills with motion default to `crop` when the aspect differs by up to 20 %, otherwise `blur`, so bars never slide through a move |
| `motion` | image, freeze | Preset or object (below). Stills default to `push_in_slow`; `"none"` disables |
| `grade` | video, image | `none`, `bw`, `bw_contrast`, `warm`, `cool`, `vintage`, `punch`, `faded`, `sepia`, `denoise` |
| `vf` | video, image | Extra raw FFmpeg filter chain (advanced, applied after the grade) |
| `deinterlace` | video | `"auto"` (from field order), `true`, `false` |
| `audio` | video | Keep the clip's own sound (default `true` for video) |
| `audio_gain_db` | video | Gain for the clip's sound (nat sound under narration: -12 to -18) |
| `fade_in`, `fade_out` | all | Fade from/to black inside the clip (use on the first and last shots) |
| `transition` | all but the first | Join with the previous clip: `"dissolve"` or `{"type": "dissolve", "duration": 0.75}` |
| `text`, `subtext` | title | Title card lines (`\n` for line breaks) |
| `color` | color, title | Background colour |
| `style` | title | `font` (family or file), `size` (px at master resolution), `color`, `subtext_size`, `subtext_color`, `subtext_font`, `text_fade` |
| `label` | any | `illustrative`, `reenactment`, `ai_generated`, `recreation`: listed under disclosure in the edit plan |
| `description`, `note` | any | Shown in the edit plan |

**Motion presets:** `push_in`, `push_in_slow` (1.0 to 1.06), `pull_out`, `pan_left_to_right`,
`pan_right_to_left`, `tilt_up`, `tilt_down`, `none`.
**Motion object:** `{"zoom": [1.0, 1.15], "pan": "center|left_to_right|right_to_left|up|down",
"focus": [x, y], "ease": true}`. `focus` is a point in the frame (0-1, 0-1) that the move
travels towards, such as a face at `[0.62, 0.35]`. Zoom values must be at least 1.0.

**Transitions:** `cut` (default), `dissolve`, `dip_to_black`, `dip_to_white`, `wipe_left`,
`wipe_right`, `slide_left`, `slide_right`, `push_left`, `push_right`, `iris_open`, `iris_close`,
`smooth_left`, `smooth_right`, `blur_dissolve`, `zoom_in`, or any FFmpeg `xfade` name. Default
durations: dissolve 0.75 s, dips 1.0 s, others 0.5 s. A transition must be shorter than both
neighbouring clips, and a clip's incoming plus outgoing transitions must fit inside it. A
transition on the first clip becomes a fade from black.

## 5. Audio items: `narration`, `music`, `sfx`

| Key | Notes |
|---|---|
| `id` | e.g. `VO03`, `M02`, `X07` |
| `source`, `asset_id` | Audio (or video) file; asset log id |
| Placement | `start` (program seconds) **or** `at_clip` / `at_scene` plus optional `offset` (seconds, may be negative). Anchors keep sound attached to its picture when the edit changes |
| `in`, `out` | Portion of the source to use |
| Length | `duration`, `end` (program time), or `until_end: true`; default is the rest of the source |
| `loop` | Music: repeat the source to fill the length |
| `gain_db` | Relative to the narration reference level (sources are loudness-normalised first). Defaults: narration 0, music -6, sfx -6 |
| `fade_in`, `fade_out` | Seconds |
| `duck` | Music: `false` keeps the item at full level under narration (rarely wanted) |
| `text` | Narration: the exact words, used for captions and words-per-minute checks |

SFX are not loudness-normalised (short sounds have no meaningful integrated loudness), so
`gain_db` is relative to the file as recorded.

## 6. `titles`

| Key | Notes |
|---|---|
| `text` | `\n` separates lines; the first line is the main line |
| Placement | `start` or `at_clip`/`at_scene` + `offset`; `duration` (default 4 s) |
| `style` | `lower_third` (name/place/date, boxed), `center`, `top_left` (labels such as "Illustrative footage"), `top_center`, `bottom_center` |
| `font`, `size`, `size2`, `color` | Main and secondary line sizes in px at master resolution. Lines are shrunk automatically if they would overflow the frame |
| `box`, `box_color`, `box_opacity` | Background box (default on for lower thirds) |
| `fade` | Fade in/out seconds (default 0.5) |

Vertical outputs place lower thirds higher (about 70 % down) to stay clear of platform UI.

## 7. `captions`

```json
"captions": {"file": "captions/en.srt", "mode": "sidecar", "language": "eng",
             "style": {"font": "Inter", "size": 14, "margin_v": 18}}
```
- `mode`: `burn` (open captions drawn into the picture), `soft` (selectable track in the file),
  `sidecar` (`.srt` and `.vtt` written next to the video; no change to the picture), `none`.
  Burn and soft also write the sidecar files.
- `style` (burn only, libass units relative to a 288-line canvas): `font`, `size` (default 14;
  10 for vertical), `bold`, `primary`/`outline`/`back` (`&HAABBGGRR`), `outline_width`, `shadow`,
  `border_style` (1 outline, 3 opaque box), `alignment` (2 bottom centre), `margin_v`.

## 8. `mix`

```json
"mix": {
  "normalize_sources": true,
  "reference_lufs": -18,
  "ducking": {"enabled": true, "targets": ["music", "program"], "amount_db": 10, "attack": 20, "release": 500},
  "bus_gain_db": {"program": 0, "narration": 0, "music": 0, "sfx": 0}
}
```
- Narration and music items are each normalised to `reference_lufs` before their `gain_db`
  applies, so levels are predictable whatever the source loudness.
- Ducking lowers the target buses by about `amount_db` while narration is speaking (sidechain
  compression keyed by the narration bus). The maximum is about 13 dB.
- After mixing, the whole programme is normalised to `output.loudness` in two passes.

## 9. Full example

See `assets/examples/timeline.example.json` (its media paths are illustrative, so validate your
own copy against real files): a title card, a dip to black, a Ken Burns move
towards a focus point, an illustrative black-and-white clip with an on-screen label, anamorphic
interlaced archival, a portrait still with blurred fill, a freeze-frame ending, two anchored
narration items, a ducked music bed, an SFX hit and burned captions.
