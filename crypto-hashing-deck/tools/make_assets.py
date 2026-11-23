"""Generate the decorative raster assets for the crypto-hashing deck.

bg.png          1920x1080 slide backdrop: deep navy, faint grid, faint hex texture
fingerprint.png transparent hero fingerprint whose ridges are written in hex
                (the SHA-256 digest of "abc", repeated along every ridge)

Run:  python3 tools/make_assets.py   (from the crypto-hashing-deck folder)
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from skimage import measure

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
os.makedirs(OUT, exist_ok=True)

MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf"
MONO_B = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"
DIGEST = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

BG = (10, 15, 31)        # #0A0F1F
CYAN = (34, 211, 238)    # #22D3EE
VIOLET = (167, 139, 250)


def backdrop():
    W, H = 1920, 1080
    rng = random.Random(7)
    base = Image.new("RGB", (W, H), BG)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # faint 80px grid
    for x in range(0, W + 1, 80):
        d.line([(x, 0), (x, H)], fill=(148, 163, 184, 7), width=1)
    for y in range(0, H + 1, 80):
        d.line([(0, y), (W, y)], fill=(148, 163, 184, 7), width=1)
    # hex texture: broken rows of hex characters
    font = ImageFont.truetype(MONO, 22)
    cw, lh = 13.2, 40
    hexchars = "0123456789abcdef"
    y = 18
    while y < H:
        x = rng.uniform(-40, 0)
        while x < W:
            run = rng.randint(6, 26)
            if rng.random() < 0.62:
                s = "".join(rng.choice(hexchars) for _ in range(run))
                # keep the middle of the slide calmer than the edges
                cx = abs((x + run * cw / 2) - W / 2) / (W / 2)
                cy = abs(y - H / 2) / (H / 2)
                k = 0.55 + 0.45 * max(cx, cy)
                a = int(rng.uniform(9, 14) * k)
                d.text((x, y), s, font=font, fill=(160, 220, 240, a))
            x += run * cw + rng.uniform(26, 90)
        y += lh
    base = Image.alpha_composite(base.convert("RGBA"), layer)
    # soft corner vignette
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    v = np.clip((r - 0.75) / 0.7, 0, 1) * 0.35
    arr = np.asarray(base).astype(np.float32)
    arr[..., :3] *= (1 - v[..., None])
    img = Image.fromarray(arr.astype(np.uint8), "RGBA").convert("RGB")
    img = img.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img.save(os.path.join(OUT, "bg.png"), optimize=True)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def fingerprint(color=CYAN, name="fingerprint.png"):
    W, H = 1100, 1240
    N = 900  # field resolution
    ys, xs = np.mgrid[0:N, 0:N]
    x = (xs / (N - 1)) * 2 - 1          # -1..1
    y = (ys / (N - 1)) * 2 - 1          # -1..1 (down is +)
    # gentle warp so the ridges are not perfect ellipses
    xw = x + 0.035 * np.sin(3.1 * y + 0.4) + 0.02 * np.sin(5.3 * y)
    yw = y + 0.03 * np.sin(2.7 * x + 1.1)
    cx, cy = 0.02, -0.16
    dx, dy = xw - cx, yw - cy
    th = np.arctan2(dy, dx)
    # loops get wider and flatter below the core, like the lower ridges of a print
    sy_ = np.where(dy > 0, 1.0 + 0.55 * np.clip(dy, 0, 1), 1.0)
    r = np.sqrt((dx / 0.80) ** 2 + (dy / sy_) ** 2)
    field = r * 15.0 * (1 + 0.035 * np.sin(2 * th + 0.6) + 0.02 * np.sin(3 * th - 0.4))
    # outline: rounded top, slightly narrower bottom
    ox = x / (0.80 - 0.10 * np.clip(y, 0, 1))
    oy = y / 0.97
    inside = (ox ** 2 + oy ** 2) < 1.0

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lines = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lines)
    font = ImageFont.truetype(MONO_B, 17)
    sx, sy = W / (N - 1), H / (N - 1)
    step = 11.2  # px between characters
    k = 0
    glyph_cache = {}

    def glyph(ch):
        if ch not in glyph_cache:
            g = Image.new("L", (24, 26), 0)
            ImageDraw.Draw(g).text((12, 13), ch, font=font, fill=255, anchor="mm")
            glyph_cache[ch] = g
        return glyph_cache[ch]

    lo, hi = math.floor(field[inside].min()), math.ceil(field[inside].max())
    rng = random.Random(3)
    for level in np.arange(lo + 0.5, hi, 1.0):
        for c in measure.find_contours(field, level):
            pts = np.stack([c[:, 1] * sx, c[:, 0] * sy], axis=1)
            # drop points outside the outline
            ii = np.clip(c[:, 0].astype(int), 0, N - 1)
            jj = np.clip(c[:, 1].astype(int), 0, N - 1)
            ok = inside[ii, jj]
            segs, cur = [], []
            for p, o in zip(pts, ok):
                if o:
                    cur.append(p)
                elif cur:
                    segs.append(cur); cur = []
            if cur:
                segs.append(cur)
            # split each ridge where it turns back, so the digest always reads left to right
            runs = []
            for seg in segs:
                seg = np.array(seg)
                if len(seg) < 6:
                    continue
                fwd = np.diff(seg[:, 0]) >= 0
                start = 0
                for i in range(1, len(fwd)):
                    if fwd[i] != fwd[i - 1]:
                        runs.append(seg[start:i + 1]); start = i
                runs.append(seg[start:])
                ld.line([tuple(p) for p in seg], fill=color + (38,), width=2)
            for seg in runs:
                if len(seg) < 3:
                    continue
                if seg[-1][0] < seg[0][0]:
                    seg = seg[::-1]
                d = np.sqrt(((seg[1:] - seg[:-1]) ** 2).sum(1))
                L = d.sum()
                if L < 30:
                    continue
                cum = np.concatenate([[0], np.cumsum(d)])
                t = 5.0
                k = rng.randrange(len(DIGEST))
                gap_at = rng.uniform(80, 420)
                while t < L - 5:
                    if t > gap_at:  # ridge endings: leave a short gap now and then
                        t += rng.uniform(22, 60)
                        gap_at = t + rng.uniform(120, 520)
                        continue
                    i = np.searchsorted(cum, t) - 1
                    i = max(0, min(i, len(seg) - 2))
                    f = (t - cum[i]) / max(d[i], 1e-6)
                    p = seg[i] + f * (seg[i + 1] - seg[i])
                    ang = math.degrees(math.atan2(seg[i + 1][1] - seg[i][1], seg[i + 1][0] - seg[i][0]))
                    ch = DIGEST[k % len(DIGEST)]
                    k += 1
                    g = glyph(ch).rotate(-ang, resample=Image.BICUBIC, expand=True)
                    # fade characters toward the rim
                    rr = math.hypot((p[0] / W) * 2 - 1, (p[1] / H) * 2 - 1)
                    alpha = int(255 * (1.0 - 0.45 * smoothstep(0.55, 1.0, rr)))
                    tint = Image.new("RGBA", g.size, color + (0,))
                    tint.putalpha(g.point(lambda v, a=alpha: v * a // 255))
                    img.alpha_composite(tint, (int(p[0] - g.size[0] / 2), int(p[1] - g.size[1] / 2)))
                    t += step
    glow = img.filter(ImageFilter.GaussianBlur(10))
    glow2 = img.filter(ImageFilter.GaussianBlur(28))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(glow2)
    out.alpha_composite(glow)
    out.alpha_composite(lines)
    out.alpha_composite(img)
    out = out.resize((1000, 1127), Image.LANCZOS)
    out.quantize(colors=200, method=Image.Quantize.FASTOCTREE).save(os.path.join(OUT, name), optimize=True)


if __name__ == "__main__":
    backdrop()
    fingerprint()
    print("ok")
