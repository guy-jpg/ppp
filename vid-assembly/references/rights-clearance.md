# Rights and clearance

Read this before using any asset the user did not create, and whenever a licence is unclear.
This is practical production guidance, not legal advice. Your job is to document provenance,
apply well-established rules, flag uncertainty early and recommend professional clearance when
the stakes call for it. Never declare something "cleared" that you have not verified.

## Contents
1. Asset status vocabulary
2. Public domain in the United States
3. Outside the United States
4. Government works
5. Creative Commons and other open licences
6. Music has two copyrights
7. What public domain and open licences do not clear
8. Myths to correct
9. Fair use and fair dealing
10. AI-generated and synthetic media
11. Attribution formats
12. When to recommend professional clearance

---

## 1. Asset status vocabulary (`asset_log.csv` -> `status`)

| Status | Meaning |
|---|---|
| `pending` | Found, not yet verified. Fine for planning and previews; not for publication |
| `public_domain` | Verified PD for the distribution territory, basis recorded in `pd_basis` |
| `cleared` | Licence verified and its conditions can be met (attribution etc. recorded) |
| `licensed` | Paid or negotiated licence in place (keep the agreement) |
| `owned` / `user_supplied` | The user created it or supplied it and confirms they hold the rights |
| `restricted` | Do not use (or conditions cannot be met); `validate_timeline.py` treats this as an error |

Record **why**: `pd_basis` ("US federal work: NASA, 1969", "published 1928, US"), the licence URL,
and the date you checked.

## 2. Public domain in the United States (as of 2026)

PD is decided per country. For US distribution:

| Category | Public domain if... | In 2026 that means |
|---|---|---|
| Works published in the US (any kind except sound recordings) | published 95+ full years ago: PD from 1 January of year (publication + 96) | published **1930 or earlier** (1931 works join on 1 Jan 2027) |
| Published 1931-1963 | copyright was **not renewed** | must be checked in renewal records (Catalog of Copyright Entries); many newsreels and industrial films were not renewed, many features were |
| Published 1931-1977 | published **without a copyright notice** | needs evidence (an original print without notice) |
| Unpublished works | author died 70+ years ago | author died **1955 or earlier**; anonymous/corporate unpublished works created 120+ years ago |
| Sound recordings | pre-1923 recordings; 1923-1946 recordings after 100 years | recordings published **1925 or earlier** (1926 recordings join on 1 Jan 2027). 1947-1956: 110 years; 1957 to 15 Feb 1972: protected until 2067 |
| US federal government works | made by federal employees as part of their duties (17 U.S.C. 105) | see section 4 |

Notes:
- **Foreign works** often had US copyright restored in 1996 (URAA), even if they had fallen into
  the US public domain for missing formalities. Treat foreign works published 1931 or later as
  protected unless verified.
- A PD film can contain newer copyrighted layers: a later music track, narration, translated
  intertitles, a restoration, or **colourisation**. Use a version where the PD layer is what you get,
  or clear the new layers.
- A faithful photograph of a PD two-dimensional artwork is generally not separately protected in
  the US; some other jurisdictions differ.

## 3. Outside the United States

- Most countries protect works for the author's life plus 70 years: authors who died in **1955
  or earlier** are PD in those countries in 2026. Some use life plus 50 or other terms.
- Films in the EU are protected until 70 years after the death of the last of the principal
  director, screenwriter, dialogue author and composer of original music: old films are often
  still protected in Europe even when they are PD in the US.
- If the video will be distributed internationally (YouTube is global), prefer assets that are PD
  or openly licensed everywhere (CC0, CC BY, works whose authors died long ago), and note
  territory-specific risks in the delivery report.

## 4. Government works

- **US federal works** (NASA, NARA federal records, NOAA, USGS, NPS, the military via DVIDS,
  FSA/OWI photographs) are not protected by copyright in the US. Caveats: material made by
  contractors or grantees, third-party content inside a government item (check credit lines),
  insignia and logos (NASA's are restricted), and implied endorsement are separate issues.
- **US state and local** government works are not covered by the federal rule; status varies by
  state.
- **Other governments** usually keep copyright (UK Crown copyright, Canadian Crown copyright).
  Some publish under open licences (UK Open Government Licence): follow that licence.

## 5. Creative Commons and other open licences

| Licence | Commercial use | Edits / adaptation | Obligations |
|---|---|---|---|
| CC0 / Public Domain Mark | yes | yes | none (courtesy credit is good practice) |
| CC BY | yes | yes | attribution: title, author, source, licence; indicate changes |
| CC BY-SA | yes | yes | attribution + adaptations must carry the same (or a compatible) licence |
| CC BY-NC | **no** | yes | attribution; non-commercial only |
| CC BY-ND | yes | **no** | attribution; no adapted versions |
| CC BY-NC-SA / BY-NC-ND | **no** | SA / **no** | combinations of the above |

What this means for video:
- **CC 4.0 states that syncing music, a performance or a sound recording to moving images
  creates adapted material.** So ND music cannot be used in a video at all, and SA music would
  require releasing the whole video under a share-alike licence. Prefer CC0 or CC BY music.
- Cropping, grading or animating an image (a Ken Burns move) is likely an adaptation: avoid ND
  images, and treat SA images as imposing share-alike on the video.
- **Commercial** includes monetised channels, advertising, sponsored content and client work.
  Treat any monetised or business use as commercial, and run `validate_timeline.py --commercial`.
- Licences are not revocable for copies already obtained, but record the licence version and
  URL you relied on.

## 6. Music has two copyrights

Every recorded piece of music carries two separate rights:
1. the **composition** (melody and lyrics: composer and publisher);
2. the **sound recording** (the specific performance: label or performer).

Beethoven's symphonies are PD compositions, but a 2015 orchestra recording is protected. To use
a commercial track you need a **sync licence** (publisher) and a **master-use licence** (label).
Free/PD music sources solve both by offering recordings whose rights holders have released them.
Content ID systems sometimes claim openly licensed or PD music; keep the licence record to dispute.

## 7. What public domain and open licences do not clear

- **Trademarks and logos** visible in footage (fine incidentally in editorial use; risky in ads or
  when featured).
- **People**: rights of publicity and privacy. Identifiable people may not be used to imply
  endorsement or in commercial contexts without releases; take extra care with private
  individuals, minors and sensitive situations.
- **Artworks, architecture, music performances** captured in footage can have their own rights
  when featured rather than incidental.
- **Archive terms of service**: a PD film downloaded under contract terms ("non-commercial use
  only") may be contractually restricted even though the copyright has expired. Note the terms.
- **Moral rights** (attribution, integrity) in some countries, even for licensed works.

## 8. Myths to correct (politely, when the user relies on them)

- "It's on YouTube / Google, so it's free." Availability is not permission.
- "I'll give credit." Credit is not a licence (except where the licence is CC BY and the like).
- "Under 10 (or 30) seconds is fine." There is no safe-harbour duration.
- "It's non-profit / educational, so it's fine." It helps a fair-use analysis; it is not a licence.
- "It's old, so it's public domain." Only if the rules in sections 2-3 say so for that territory.
- "I bought the song." A purchase is a personal listening licence, not a sync licence.

## 9. Fair use and fair dealing

US fair use (and narrower "fair dealing" elsewhere) can permit limited use of copyrighted
material for commentary, criticism, news reporting or scholarship, judged case by case on four
factors (purpose, nature of the work, amount used, market effect). It is a legal defence decided
after the fact, not a permission. If the user wants to rely on it (for example, a documentary
critiquing a broadcast), list each such use separately as "fair use claim: requires counsel", use
only what the commentary needs, and recommend review by a media lawyer or an E&O insurer before
publication. Never present fair use as settled.

## 10. AI-generated and synthetic media

- Generated images, video or voices may only be used if the generating tool's terms allow it, and
  they must never be presented as archival or as a record of real events. Label them
  (`label: ai_generated`) and disclose them to the viewer.
- Platforms (YouTube among others) require disclosure of realistic altered or synthetic content.
- Purely AI-generated material may not be protected by copyright in the US, which affects the
  user's own ability to protect it; mention this if they plan to license the video.
- Never synthesise a real person's voice or likeness without documented consent.

## 11. Attribution formats

Use TASL (Title, Author, Source, Licence) and say what was changed:
> "<Photo title>" by <Photographer>, Library of Congress, Prints & Photographs Division
> (FSA/OWI collection), public domain.
> "Rocket.jpg" by Jane Roe (fictional example), via Wikimedia Commons, CC BY-SA 4.0
> (https://creativecommons.org/licenses/by-sa/4.0/). Cropped and animated.
> Music: "Slow Build" by Composer X, CC BY 4.0.

Put attributions in the end credits and in the video description. `validate_timeline.py --report`
collects them from the asset log under "Credits and attributions". Courtesy credits to archives
("Footage courtesy of NASA") are good practice even when not required.

## 12. When to recommend professional clearance

Say so explicitly in the delivery report when any of these apply:
- advertising, sponsored or client work; broadcast, streaming-platform or theatrical distribution;
- commercial music, major-label recordings or anything claimed under fair use;
- identifiable private individuals, minors, or people shown in sensitive situations;
- assets with status `pending`, unclear chains of title, or foreign works of uncertain status;
- distribution in territories where the PD status differs.
