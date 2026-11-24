# Dolce & Gabbana — 14.3 s vertical sting (treatment)

**Brief:** "a sharp ~15 s video for Dolce & Gabbana" (one line, Hebrew). Fan-made / spec film, not commissioned.
**Format:** 1080×1920 (9:16, Reels / TikTok / Stories), 30 fps, 14.3 s, music + effects, no narration.
**Personality:** premium, energetic, established, human, maximal. Read from the house codes: black & white, gold,
leopard, Sicilian maiolica, red, polka dots, zebra; Italian words (amore, Sicilia, famiglia, barocco).

**Direction chosen (A · Fit): "the prints spell the name"** — kinetic type + the house prints as the material.
The name is the spine: DOLCE in leopard → GABBANA over maiolica → a burst of prints and Italian words on the beat
→ silence → the two halves meet, each filled with its print → the plain lockup.
Not chosen (offer at hand-over): B · depth — the name extruded in gold and turned in a studio with the prints as
surfaces; C · editorial collage — Sicilian baroque cut-outs, lace, roses, newspaper type (needs licensed photos).

**Departures from the defaults:** no real logo file / photos (the site and photo libraries were unreachable from
the build machine) — every print is generated in code and the name is typeset, not a logo copy.
The music is a hand edit of one library track (see below), because the auto-arranger always keeps the track's quiet intro.

## Rhythm sheet (120 bpm, beat = 0.5 s, bar = 2 s)

| stretch | time | energy | events/bar | picture | sound |
|---|---|---|---|---|---|
| hook | 0–2 | 7 | 6 | leopard full bleed, camera pulls back 1.32→1; DOLCE letters slam on eighths; 1.0 s: the print collapses into the letters | track (tension section), thud on the flip |
| tiles | 2–4 | 6 | 3 | black ground collapses into a band; maiolica floor rises from 72° and travels; GABBANA slams into the band | whoosh |
| burst | 4–7.5 | 9 | 8 | band locked in place; prints change behind it every beat: red AMORE · maiolica SICILIA · zebra AUDACE · gold BAROCCO · dots FAMIGLIA; then 4 half-beat flashes, band thins | hit per cut, ticks on the flashes |
| stop | 7.5–8 | 1 | 1 | band swallows the frame; a small gold & | music cut to silence, reverse cymbal |
| drop | 8–11 | 10→6 | 2 | DOLCE (leopard) from above, GABBANA (maiolica) from below, & springs; 9 s gold rules; 10 s prints swap letters | track's lift into its loudest section, impact; draw; hit |
| lockup | 11–14.3 | 3 | 1 | stack folds into DOLCE & GABBANA; 12 s rule + MILANO · DAL 1985 on the track's home-chord hit; slow push | whip; the track's own outro and hard stop |

Hook within 3 s ✓ · burst of 9 cuts in 3.5 s at 28–52 % ✓ · stop ✓ · hero on the strongest musical point ✓.

## Continuity chain
leopard frame → leopard inside DOLCE (mask flip) → black ground → band (collapse) → band stays while prints change →
band → full black (expand) → small & → big & of the stack → stack folds → lockup.

## Stills
hook 0.6 s · hero 9.2 s · densest 4.6 s · end 14.0 s (`om still . --at 0.6,4.6,9.2,14.0`).

## Music
"Forward Drive" (huashu-motion default library, `music/LICENSE.md`: any use, no credit), 120 bpm, conf 0.66.
Edited by hand into `assets/music/dg-cue.wav`: track 136.24–143.74 s (tension) · 0.5 s silence (the stop) ·
144.24–148.28 s (the lift into the loudest section, on the drop) · 40 ms crossfade into 174.24 s (the track's own
home-chord bar and hard stop). All joins on bar lines.
