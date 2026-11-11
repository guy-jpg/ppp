# Podcast thumbnail (1920x1080)

- `thumbnail.png` / `thumbnail.svg` – template with the title "בגג של הב״הדים #29".
- `thumbnail-layout.png` – layout template: background, 8 slots (A–H), headphones, mics, title area.
- `thumbnail-layout.svg` – same template, editable (open in Figma/Illustrator/Inkscape or import to Canva).
- `prompt.json` – corrected prompt for an image tool with face references (Midjourney `--cref`, Flux/Ideogram references).
- `gen.py` – regenerates the template: `python3 gen.py`.

Use only photos of the actual hosts, with their consent.

## With real faces
Put square crops `A_sq.jpg` … `H_sq.jpg` in a folder (not committed) and run:
`FACES_DIR=/path/to/faces OUT=/path/to/out python3 gen.py`

## v2 (cut-out style, 10 hosts)
`v2/seg.py` cuts each host out with the u2net_human_seg ONNX model (models/human.onnx), `v2/compose.py` builds the thumbnail. Photos are not committed.
