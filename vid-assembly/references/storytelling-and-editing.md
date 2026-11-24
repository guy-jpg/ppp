# Storytelling and editing craft

Read this when shaping the story, writing the storyboard, or making cutting decisions.
The guiding order of priorities comes from Walter Murch's "rule of six": a cut should serve
**emotion** first, then **story**, then **rhythm**, then eye-trace, then the 2D plane, then 3D space.
When a technically "correct" cut fights the emotion of the moment, the emotion wins.

## Contents
1. Story before footage
2. Structures by format
3. Writing narration for pictures
4. Shot grammar
5. Pacing
6. Transitions
7. Working with archival footage
8. Stills and the Ken Burns move
9. Titles, text and typography
10. Openings and endings
11. Ethics of the edit
12. Review checklist

---

## 1. Story before footage

Before touching the timeline, write three things in the brief:
- **Logline**: one sentence with a subject, a tension and a stake. "Two engineers with borrowed
  equipment try to catch a signal nobody believes exists."
- **Driving question**: what the viewer wants answered and keeps watching for.
- **Feeling at the end**: what the viewer should feel or understand when the screen goes dark.

Every scene must move the driving question forward or deepen the feeling. If a beautiful shot
does neither, it goes, however good the footage is.

## 2. Structures by format

| Format | Length | Shape |
|---|---|---|
| Social short (Reels/Shorts/TikTok) | 15-60 s | Hook in the first 1-2 s (motion, a question or a striking image plus text), one idea, fast payoff, ending that loops or lands a punchline. Burned-in captions; text on screen carries meaning when muted |
| Promo / trailer | 30-150 s | Establish world, introduce tension, escalate (shorter shots, rising music), button (a final beat after the music hit), title and call to action |
| Explainer | 2-8 min | Hook (0-10 s) -> promise ("by the end you'll know...") -> context -> 3-5 beats, each answering one question -> recap/payoff |
| Mini-documentary | 5-20 min | Cold open (the most gripping moment, out of order) -> title -> context -> rising stakes -> turning point -> climax -> resolution -> coda. Change music at act breaks |
| Tribute / memorial / montage | 2-6 min | Chronological or thematic arc driven by music; few words; build to an emotional peak then a quiet final image |
| Historical archival piece | 3-15 min | Place and date the viewer early (lower thirds, maps, headlines), follow people rather than events, end on consequence or legacy |
| Photo slideshow / recap | 1-5 min | Group photos into sequences (place, time, people); vary scale (wide, medium, close); music sets the pacing |

A **beat sheet** turns the structure into scenes: list each beat with its purpose, its emotional
temperature (calm / rising / peak / release) and approximate length. Vary the temperature: a
film that is all peaks feels like none.

## 3. Writing narration for pictures

- Write for the ear: short sentences, one idea each, concrete nouns, active verbs.
- **Say what the picture cannot.** Never describe what is on screen ("Here we see a rocket").
  Add the meaning, the stakes, the context, the number, the name.
- Pace: documentary narration runs 130-160 words per minute (about 2.5 words per second).
  Budget the script to cover 50-75 % of the running time; the rest belongs to pictures, natural
  sound and music. Wall-to-wall narration exhausts the viewer.
- Start a narration line 0.3-0.5 s after a cut, not on it, so the picture lands first.
- Leave **breathing holes** of 2-4 s after important lines or before act changes.
- Names, dates and numbers come from `research/sources.md`, never from memory.
- When quoting a real person, use their documented words with a source. Never invent quotes.

## 4. Shot grammar

- **Establish, then go closer**: wide (where), medium (who), close (what matters). Re-establish
  after a change of place or time.
- **Cut on action**: cut during a movement (a hand reaching, a door opening) so the motion hides
  the cut.
- **Screen direction**: keep movement consistent within a sequence. A rocket rising left to right
  followed by one moving right to left reads as a different journey. Mirror-flipping archival to
  fix direction alters the record; avoid it unless the shot is purely illustrative.
- **Match cuts**: join shots with matching shape, motion or colour (a spinning wheel to a spinning
  reel) to link ideas without words.
- **J-cut / L-cut**: let the next scene's sound start before its picture (J), or let the current
  sound carry over the next picture (L). It is the single most effective way to make an edit
  feel smooth. With this renderer: anchor the next scene's narration, SFX or music with a
  negative `offset` (J) or let an audio item run past the cut (L).
- **Cutaways** cover jumps in continuous footage and give the viewer detail.
- **Jump cuts** (same framing, time skipped) read as either an error or a deliberate energetic
  style. Use them only on purpose.
- **Avoid repetition**: the same footage shown twice reads as filler unless it is a deliberate
  callback (`validate_timeline.py` flags reused ranges).

## 5. Pacing

Average shot length (ASL) sets the energy. Typical ranges:

| Content | Shot length |
|---|---|
| Social, trailer peaks, action montage | 0.5-2 s |
| Explainer B-roll | 2-4 s |
| Documentary archival under narration | 3-6 s |
| Emotional holds, landscapes, closing images | 6-10 s |
| Stills with a Ken Burns move | 4-8 s |
| Interview or actuality sound bites | as long as the bite, cut at the end of a thought |

- Cut on the rhythm of the narration: change pictures at phrase or sentence boundaries.
- With music, cut on beats: every beat in fast sections, every 2 or 4 beats in slower ones.
  Hard cuts land on downbeats; dissolves straddle them.
- Accelerate into climaxes (shrinking shot lengths), then release with a long hold.
- Let important moments breathe: a beat of silence or a held shot after a revelation is worth
  more than another line of narration.

## 6. Transitions

The cut is the default. Use anything else only when it means something.

| Transition | Meaning / use | Typical length |
|---|---|---|
| Cut | Continuous time, energy, clarity: most edits | 0 |
| Dissolve | Passage of time, memory, softness, montage of stills | 0.5-1.5 s |
| Dip to black | End of an act or chapter, a large time jump, gravity, before a title | 0.75-1.5 s |
| Fade in / out (from/to black) | Start and end of the film; use `fade_in` / `fade_out` | 0.5-2 s |
| Dip to white | Flash, memory, explosion, revelation. Rare | 0.5-1 s |
| Match cut | Linking ideas through shape or motion. No effect, just a cut | 0 |
| Smash cut | Sudden contrast (loud to silent, calm to chaos) | 0 |
| Wipes, slides, iris, zoom | Stylised: period newsreel flavour (wipes, iris), playful or energetic social pieces. Never in sombre material | 0.3-0.7 s |

Rules of thumb: no more than one non-cut transition style per film (plus fades); never use a
dissolve to hide a bad cut; avoid dissolving between two moving shots that move in opposite
directions; dissolves cost length (each one overlaps the clips).

## 7. Working with archival footage

- **Aspect ratio**: never stretch. Pillarbox 4:3 inside 16:9 (`fit: pad`), the honest and
  standard choice. Crop to fill only when the composition survives it. For vertical delivery
  use `fit: blur` (blurred fill behind the full frame).
- **Anamorphic and interlaced sources** (DV, broadcast tape transfers) are corrected
  automatically: non-square pixels are squared and interlaced video is deinterlaced.
- **Frame rate of silent-era film**: film shot at 16-20 fps and transferred at 24 fps plays too
  fast and jerky. If people walk comically fast, try `speed: 0.75`-`0.85`. If the file is
  natively 16-18 fps, the renderer conforms it to the output rate at the correct speed.
- **Resolution**: upscaled SD footage looks soft. Keep such shots short, or frame them smaller
  with a border. Disclose AI upscaling, colourisation or frame interpolation in the credits;
  never use them to change what the footage shows.
- **Grade for consistency**, not style: bring a sequence of mixed sources to a common contrast
  (`bw_contrast` for mixed black-and-white material, light `denoise` for grainy video). Don't
  add fake film damage to real archival.
- **Watermarked previews** and burned-in timecode from archive viewing copies are not
  deliverable footage: fetch the clean master file.
- **Label** representative footage (`label: illustrative`) when it is not of the exact
  event, place or person described (see section 11).

## 8. Stills and the Ken Burns move

- Motion is what turns a slideshow into a film. Every still gets a slow move unless a static
  frame is the point (the default is a gentle `push_in_slow`).
- **Move towards meaning**: push in on the face or detail the narration is about (`focus`), pan
  across a group to reveal it, pull out to reveal context at the end of a line.
- Keep moves slow: 5-15 % zoom over 5-8 s. Fast moves on stills look cheap.
- Alternate directions between consecutive stills (in, then pan, then out) so the sequence
  flows rather than repeats.
- Start and end frames should both be good compositions; check the framing on the contact sheet.
- Portrait-orientation photos in a 16:9 film: blurred fill, or a slow tilt across the photo with
  `fit: crop` when the subject runs vertically.
- Large scans (archives often provide 4000+ px TIFFs) give the cleanest moves; the renderer
  supersamples to avoid jitter.

## 9. Titles, text and typography

- One typeface family, at most two (a serif for historical gravity, a clean sans for modern
  information). Consistent sizes and positions throughout.
- **Lower thirds**: line 1 = name or place; line 2 = role or date. Hold at least 3 s plus 0.3 s per
  word, and never over a cut to a different subject.
- **Safe areas**: keep text inside 90 % of the frame (title safe). For vertical video keep text out
  of the top 10 %, bottom 20 % and right 15 % where platform buttons sit (the renderer's vertical
  placements already do this).
- Contrast: a soft box or shadow over busy footage; never text on a bright, busy background
  without support.
- Title cards: let them breathe (3-5 s), fade the text, often over black or a held image after the
  cold open.
- Dates and places on screen orient the viewer in historical pieces: "Cape Canaveral, Florida /
  16 July 1969".

## 10. Openings and endings

- **Opening**: start in the middle of something (cold open) or with the most arresting image or
  sound. In the first 5-10 s (1-2 s on social) the viewer must know why to keep watching. Title
  after the hook, not before.
- **Ending**: resolve the driving question, then give one final image room to land (6-10 s) with
  the music's natural ending (a button) rather than a fade in the middle of a phrase. Fade to
  black. Credits: archives and sources, music and licences, attributions, narrator, "Illustrative
  footage" or AI disclosures where applicable.

## 11. Ethics of the edit

- Footage of a different event, date or place must not be presented as the subject. If you need
  representative footage, label it in the plan, keep the narration truthful about it, and
  consider an on-screen "Illustrative footage" note.
- Reenactments, recreations, AI-generated images and synthetic voices are labelled in the plan
  and disclosed to the viewer (platforms such as YouTube also require disclosure of realistic
  synthetic or altered media).
- Don't edit sound bites to change their meaning; keep the context of quotes.
- Treat images of death, war, disaster and private individuals with restraint. Ask whether the
  image is necessary to the story; consider content warnings; blur private individuals in
  sensitive contexts.
- Don't fake period authenticity: added sound effects are sound design, not a recording of the
  event; never claim otherwise.

## 12. Review checklist (before the master render)

- [ ] The first 5 s hook; the title arrives after it.
- [ ] Every scene serves the logline; nothing is there just because the footage exists.
- [ ] No shot lingers without reason; no stills are static unintentionally.
- [ ] Narration says what the pictures can't, with breathing room; facts are sourced.
- [ ] Transitions are cuts unless they mean something; one stylised transition family at most.
- [ ] Text is legible, inside safe areas and held long enough to read.
- [ ] Representative or synthetic material is labelled; no misattributed footage.
- [ ] The ending lands on an image and a musical resolution.
