# Delivery specifications and FFmpeg recipes

Read this when choosing output formats, preparing platform versions, handing the edit to
another editor, or doing one-off media operations outside the timeline.

## Contents
1. Choosing the format
2. Platform notes
3. Versions worth delivering
4. When there is no renderer: the edit package
5. FFmpeg recipes for one-off jobs

---

## 1. Choosing the format

**Aspect ratio**: follow the platform where most viewers will watch. Make 16:9 the master for
YouTube, the web and TV; 9:16 for Shorts, Reels and TikTok; 1:1 or 4:5 for feeds. A vertical
version of a 16:9 film is a re-edit (closer framing, bigger text, captions burned in), not just a
reformat: create a second timeline with `preset: vertical-1080x1920` and revisit the framing of
each shot (`fit`, `motion.focus`).

**Frame rate**: match the majority of the source footage.
- 24 fps: cinematic default; film-originated archival; mixed stills-heavy projects.
- 25 fps: European/PAL-sourced video, EBU broadcast.
- 29.97/30 fps: NTSC-sourced video, US broadcast, screen recordings, most phone footage.
- 50/60 fps: sport, gaming, or when most sources are high frame rate.
Don't mix: the renderer conforms every clip to the output rate.

**Resolution**: 1080p is the safe default. Choose 4K only when most sources are 4K; upscaled SD
archival gains nothing from a 4K master.

## 2. Platform notes

Specs change; check the platform's current help pages for limits on length and file size.

| Platform | Master | Notes |
|---|---|---|
| YouTube | `youtube-1080p` or `youtube-4k` | Upload the SRT/VTT as a subtitle track. Custom thumbnail 1280x720. Chapters from the scene list (timestamps in the description). Disclose synthetic/altered realistic content when uploading |
| Vimeo | `youtube-1080p` | Upload captions as a text track |
| Shorts / Reels / TikTok | `vertical-1080x1920` | Burned-in captions; key text inside the safe zone; hook in the first 1-2 s; trending audio is licensed only inside the app's own editor, so music added off-platform must be cleared |
| LinkedIn / X / Facebook feed | `square-1080` or 16:9 | Burned-in captions; autoplay is muted |
| Broadcast | `broadcast-hd-ebu` / `-atsc` | Follow the broadcaster's spec sheet (slate, bars and tone, audio track layout, captions format); deliver a textless version too |
| Client / archive master | `prores-master` | Plus an H.264 review copy |

## 3. Versions worth delivering

- **Main master** (the preset above).
- **Review copy**: the `--preview` render, small enough to share for comments.
- **Textless master**: copy the timeline, set `"titles": []` and captions `mode: "sidecar"`, and
  render. Used for translations and re-versioning.
- **Caption files**: `.srt` and `.vtt` beside the master (written automatically).
- **Poster frame / thumbnail**: `ffmpeg -ss 00:00:41.5 -i master.mp4 -frames:v 1 -q:v 2 poster.jpg`.
- **Paperwork**: `edit_plan.md` (edit decisions and cue sheet), `asset_log.csv` (provenance and
  licences) and the credits text.

## 4. When there is no renderer: the edit package

When `check_env.py` reports PLAN_ONLY (or rendering is impossible), deliver everything an editor
needs to finish the film in any NLE (Premiere Pro, DaVinci Resolve, Final Cut Pro, Shotcut,
Kdenlive), and say plainly that no video was rendered:
1. `storyboard.md`: story, scene purposes, shot descriptions.
2. `timeline.json` + `edit_plan.md`: every shot's source file, source in/out, program in/out
   timecode, transitions, framing/motion notes, and the audio cue sheet. Run
   `validate_timeline.py --no-probe --report edit_plan.md` if ffprobe is unavailable.
3. `captions/*.srt` (timed from the plan; re-check against the final cut).
4. `asset_log.csv` and credits.
5. The exact commands to render it once FFmpeg is installed:
   `python scripts/render.py timeline.json --preview`, then without `--preview`.

An editor rebuilds the cut by placing each clip at its program timecode with the listed source
in/out. If `opentimelineio` is installed, a timeline can also be exported to NLE interchange
formats, but this skill does not ship that converter: do not promise one.

## 5. FFmpeg recipes for one-off jobs

These are for preparing assets; the edit itself belongs in `timeline.json`.

```bash
# Inspect a file
ffprobe -v error -show_format -show_streams -of json input.mp4

# Fast trim without re-encoding (cuts at keyframes: leave a margin)
ffmpeg -ss 00:12:00 -i reel.mpg -t 90 -c copy reel_part.mpg

# Frame-accurate trim (re-encodes)
ffmpeg -ss 00:12:03.4 -i reel.mpg -t 8.2 -c:v libx264 -crf 16 -c:a aac clip.mp4

# Extract audio as WAV
ffmpeg -i interview.mp4 -vn -ac 1 -ar 48000 -c:a pcm_s24le interview.wav

# Normalise a single file for sharing (one pass)
ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k out.mp4

# Burn captions into an existing video
ffmpeg -i in.mp4 -vf "subtitles=captions/en.srt:force_style='FontSize=14,Outline=1.2'" -c:a copy out.mp4

# Add a soft caption track to an MP4 without re-encoding
ffmpeg -i in.mp4 -i captions/en.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=eng out.mp4

# Convert to a ProRes 422 HQ master
ffmpeg -i in.mp4 -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le -c:a pcm_s24le master.mov

# Tone-map an HDR (PQ/HLG) clip to SDR before editing (needs FFmpeg built with zimg/zscale).
# Works on correctly tagged HDR files. If ffprobe shows no color_transfer, prefix the filter with
# "setparams=color_trc=smpte2084:color_primaries=bt2020:colorspace=bt2020nc," (arib-std-b67 for HLG).
ffmpeg -i hdr.mov -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" -c:v libx264 -crf 16 -c:a copy sdr.mp4

# Stabilise shaky handheld footage (two passes; needs FFmpeg built with vidstab)
ffmpeg -i shaky.mp4 -vf vidstabdetect=result=transforms.trf -f null -
ffmpeg -i shaky.mp4 -vf vidstabtransform=input=transforms.trf:smoothing=20,unsharp=5:5:0.8 -c:a copy steady.mp4

# Contact sheet of any video (also see qc_output.py and probe_media.py --thumbs)
ffmpeg -i in.mp4 -vf "fps=1/10,scale=320:-2,tile=5x4" -frames:v 1 sheet.jpg
```
