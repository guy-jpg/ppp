# Where to find footage, stills, music and sound effects

Read this when building the search plan for a production. Pair it with `rights-clearance.md`:
finding an asset is half the job, confirming you may use it is the other half.
Archive terms change; the landing page of each item is the authority, not this list.

## Contents
1. How to search well
2. Moving images and stills
3. Music
4. Sound effects
5. Free stock (not public domain)
6. Using the search script, and what to do when archives are unreachable
7. Downloading: quality and hygiene

---

## 1. How to search well

- **Search for the shot, not the idea.** "crowd waving flags parade 1945" finds footage;
  "victory and joy" doesn't.
- **Use period vocabulary**: "aeroplane", "motor car", "wireless", "talking picture", "colored"
  (as catalogued historically), and the official names of agencies and units ("Signal Corps",
  "Office of War Information", "Farm Security Administration").
- Add **place and year**, and try the names of **people** involved; archives catalogue by
  subject, person and date.
- Look for **outtakes, unedited footage and B-roll** (often cleaner than finished films).
- Make a shot wish-list per scene before searching, and log which searches found nothing:
  that gap shapes the storyboard (see "When the footage doesn't exist" in SKILL.md).

## 2. Moving images and stills

| Source | What it has | Rights notes |
|---|---|---|
| **Internet Archive, Moving Image Archive** (archive.org/details/movies) | Educational, industrial, government and amateur films, newsreels, early features | Uploader-supplied licence metadata: verify. Search fields: `collection:`, `mediatype:movies`, `year:[1930 TO 1950]` |
| **Prelinger Archives** (archive.org/details/prelinger) | Ephemeral films: advertising, educational, industrial, home movies (1900s-1980s) | Largely released into the public domain by the collector; some items carry CC terms. Check each item page |
| **US National Archives (NARA)** (catalog.archives.gov) | Federal agency films and photos (military, NASA, USIA, WPA), Universal Newsreels (1929-1967) | Federal works are generally public domain; every record has "use restrictions" fields, and donated material can be restricted. Universal Newsreels are widely treated as public domain; confirm per item |
| **NASA Image and Video Library** (images.nasa.gov) | Spaceflight footage, photos and audio from 1958 onwards | Generally not copyrighted (US federal work). Don't use NASA insignia or imply endorsement; respect third-party credits; check people's likeness for commercial use |
| **Library of Congress** (loc.gov) | Photos (incl. FSA/OWI 1935-1944: Dorothea Lange, Walker Evans), early films, maps, newspapers (Chronicling America), recordings | Each item has a "Rights & Access" statement; "No known restrictions" means none were found, not none exist. FSA/OWI photos are federal works |
| **Wikimedia Commons** (commons.wikimedia.org) | Millions of images, many videos, maps, diagrams | Per-file licence on the file page (PD, CC0, CC BY, CC BY-SA). Attribution and share-alike apply |
| **Smithsonian Open Access** (si.edu/openaccess) | Museum images and 3D models | Use only items marked CC0 |
| **Europeana** (europeana.eu) | European libraries, archives, museums incl. film | Per-item rights statement; filter for re-use allowed |
| **Open Images / Beeld en Geluid** (openbeelden.nl) | Dutch newsreels and broadcasts | Mostly CC BY-SA: share-alike obligations |
| **DVIDS** (dvidshub.net) | US military video and photos | Generally public domain; no implied endorsement; check for restricted items |
| **NOAA, USGS, National Park Service** | Weather, oceans, geology, landscapes, wildlife, park B-roll | US federal works; check credits on items made by contractors or partners |
| **ESA** (esa.int, multimedia) | Space imagery and video | Many items CC BY-SA 3.0 IGO; others restricted. Check each |
| **British Pathé / Reuters** (britishpathe.com) | Newsreels 1896-1978 | **Not public domain.** Commercially licensed; free viewing online is not a licence |
| **AP Archive, Getty, Shutterstock, Pond5 (paid)** | Professional news and stock footage | Paid licences; quote from the vendor |

Useful public-domain still types for documentary gaps: maps, newspaper front pages (Chronicling
America, pre-1931), government posters, patent drawings, official portraits, and FSA/OWI
photographs.

## 3. Music

| Source | Rights notes |
|---|---|
| **Musopen** (musopen.org) | Public-domain compositions with recordings released for free use; check each recording's licence |
| **Free Music Archive** (freemusicarchive.org) | Per-track CC licences; many are NC (no commercial use) |
| **Incompetech, Kevin MacLeod** (incompetech.com) | CC BY 4.0 (credit required), or a paid licence without credit |
| **YouTube Audio Library** (YouTube Studio) | Free for videos; some tracks require attribution in the description; read the terms for use outside YouTube |
| **ccMixter** (ccmixter.org) | CC licences, often NC |
| **Pixabay Music** | Pixabay Content License (not CC); commercial use allowed with restrictions; Content ID claims possible |
| **Internet Archive 78rpm / Great 78 Project** | Historic recordings; US public-domain status depends on recording date (see `rights-clearance.md`); the composition may be separately protected |
| **Openverse audio** (openverse.org) | Aggregates Freesound, Jamendo and others with licence filters |
| **Library of Congress National Jukebox** | Listening collection; recordings are generally **not** cleared for reuse |

Commercial releases need sync and master licences (see `sound-design.md`).

## 4. Sound effects

| Source | Rights notes |
|---|---|
| **Freesound** (freesound.org) | Per-sound CC0, CC BY or CC BY-NC; attribution for BY |
| **BBC Sound Effects** (sound-effects.bbcrewind.co.uk) | RemArc licence: personal, educational or research use only. Commercial use needs a paid licence |
| **Sonniss GDC bundles** | Royalty-free for commercial use under the bundle licence; no attribution required (check the bundle) |
| **YouTube Audio Library** | Free sound effects for videos |
| **Openverse audio** | Licence-filterable search across sources |

## 5. Free stock (not public domain)

Pexels, Pixabay, Mixkit, Videvo and similar sites offer free footage under **their own
licences**. Typically allowed: use in videos, commercial included. Typically forbidden: reselling
or redistributing the clip on its own, implying endorsement by identifiable people, using people
in sensitive contexts, and trademarks shown in the clip. Log the licence like any other. Stock
clips are modern and staged: never present them as archival or as the actual event.

## 6. Using the search script

```bash
python scripts/search_archives.py "dust storm kansas 1935" --providers ia,loc,commons,nasa \
    --media video --limit 8 --out research/candidates.json --md research/candidates.md
python scripts/search_archives.py "dust storm" --providers loc,commons --media image
python scripts/search_archives.py "wind howling" --providers openverse --media audio --commercial
python scripts/search_archives.py resolve ia:<identifier>    # list downloadable files
python scripts/search_archives.py resolve nasa:<nasa_id>
```

The script prints per-provider status. When a provider is **unreachable** (network policy,
outage), say so plainly and fall back:
1. Give the user ready-made search links for the planned queries, for example:
   - `https://archive.org/search?query=<terms>&and[]=mediatype%3A%22movies%22`
   - `https://images.nasa.gov/search?q=<terms>`
   - `https://commons.wikimedia.org/w/index.php?search=<terms>&title=Special:MediaSearch&type=video`
   - `https://www.loc.gov/search/?q=<terms>&fa=online-format:video`
   - `https://catalog.archives.gov/search?q=<terms>`
   - `https://openverse.org/search/?q=<terms>`
2. Ask them to download the chosen files into `media/` (or `audio/`) and send the item URLs so
   the asset log can be completed.
3. Continue with the storyboard using the shot wish-list, marking unsourced shots `[NEEDS FOOTAGE]`.

Never fill the gap with invented items, IDs or URLs.

## 7. Downloading: quality and hygiene

- Prefer the **original** file over low-bitrate derivatives (on Internet Archive avoid "512Kb
  MPEG4" when an original or h.264 HD derivative exists; on NASA prefer `~orig`; on Commons the
  `download_url` is the original upload).
- Avoid watermarked previews and files with burned-in timecode.
- Use `fetch_asset.py` so every file is logged with its source URL, licence and retrieval date.
  Name files descriptively (`dust_storm_kansas_1935_nara.mp4`).
- Keep downloads inside the project (`media/archival`, `media/stills`, `audio/music`, `audio/sfx`).
- Large originals (multi-GB MPEG-2) can be trimmed first to the needed range with
  `ffmpeg -ss <in> -i big.mpg -t <dur> -c copy part.mpg` (cuts at keyframes, so leave a margin).
