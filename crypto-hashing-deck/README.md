# גיבוב קריפטוגרפי — Hebrew deck (69 slides)

Chapter 1 of a network-security course: SHA-2, SHA-3 and BLAKE, in Hebrew (RTL), in the "Midnight Cipher" design.

The live deck is a Claude Slides artifact: https://claude.ai/artifact/LdFUPtJzRfQp4kuS4RiCx4.
From its page it exports to PowerPoint (.pptx) or PDF. This folder holds its source.

- `project/deck.json`: slide order, sections and fonts (Heebo, JetBrains Mono)
- `project/deck.css`: the shared design system (palette, type scale, cards, code panels, tables, motion)
- `project/slides/sNN.html`: one file per slide. Speaker notes are in each slide's `<aside>`.
- `assets/`: the generated background texture and hero fingerprint. They are uploaded to the artifact and referenced as `/_blob/…`.
- `tools/make_assets.py`: regenerates the two images. The fingerprint ridges are written in SHA-256("abc").
- `tools/bidi_lint.py`: flags Hebrew text that mixes in Latin letters or digits without an RTL wrapper.

## Right-to-left notes

The Slides format has no `direction` property, so RTL is handled by hand:

- Every Hebrew line is wrapped in U+202B … U+202C (RLE … PDF). In the source these appear as `&#8235;` and `&#8236;`.
- LTR runs inside Hebrew text, such as bit strings and `8 = RSASHA256`, use U+202A (LRE).
- Rows, cards and tables use `flex-direction: row-reverse`, so the first item sits on the right.
- Code, hex values and formulas stay left-to-right in monospace.
