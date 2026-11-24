// Dolce & Gabbana signature prints, generated in code (deterministic: same seed, same pixels).
// leopard()  — rosettes on a warm tan ground (cellular rings, domain-warped, broken into C-shapes)
// zebra()    — black/white stripes bent by fractal noise
// majolica() — a Sicilian maiolica tile (cobalt, ochre, green on glaze white) as an SVG data URL
// All raster prints are returned as PNG data URLs so they can be CSS backgrounds and SVG <pattern> images.
(function () {
  function hash(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += amp * vnoise(x * f, y * f, seed + o * 17); n += amp; amp *= 0.5; f *= 2.03; }
    return s / n;
  }
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const mix = (a, b, t) => a + (b - a) * t;

  function leopard(W, H, seed) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); const px = img.data;
    const k = W / 1080;                 // pattern scale follows the canvas resolution
    const S = 118 * k;                  // rosette cell
    const S2 = 54 * k;                  // small spot cell
    const cols = Math.ceil(W / S) + 2, rows = Math.ceil(H / S) + 2;
    // rosettes: centre, radius, ring thickness, irregularity phases, gap pattern
    const ros = [];
    for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
      const h1 = hash(i, j, seed), h2 = hash(i, j, seed + 1), h3 = hash(i, j, seed + 2), h4 = hash(i, j, seed + 3);
      ros.push({
        x: (i + 0.18 + 0.64 * h1) * S, y: (j + 0.18 + 0.64 * h2) * S,
        r: S * (0.27 + 0.12 * h3), th: 0.40 + 0.10 * h4,
        a1: h1 * 6.283, a2: h2 * 6.283, a3: h3 * 6.283,
        gk: 3 + Math.floor(h4 * 3), gp: h3 * 6.283, gt: -0.95 + 0.55 * h2,
      });
    }
    const NC = cols + 1;
    const at = (i, j) => (i < -1 || j < -1 || i > cols - 1 || j > rows - 1) ? null : ros[(j + 1) * NC + (i + 1)];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // domain warp: organic edges
        const wx = x + (fbm(x / (70 * k), y / (70 * k), seed + 40, 2) - 0.5) * 34 * k;
        const wy = y + (fbm(x / (70 * k), y / (70 * k), seed + 80, 2) - 0.5) * 34 * k;
        const ci = Math.floor(wx / S), cj = Math.floor(wy / S);
        let ring = 0, core = 0, near = 9;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const r = at(ci + di, cj + dj); if (!r) continue;
          const dx = wx - r.x, dy = wy - r.y, d2 = dx * dx + dy * dy, lim = r.r * 1.35;
          if (d2 > lim * lim) { const q = Math.sqrt(d2) / r.r; if (q < near) near = q; continue; }
          const d = Math.sqrt(d2), th = Math.atan2(dy, dx);
          const rr = r.r * (1 + 0.16 * Math.sin(2 * th + r.a1) + 0.09 * Math.sin(3 * th + r.a2) + 0.05 * Math.sin(5 * th + r.a3));
          const inner = rr * (1 - r.th), q = d / rr; if (q < near) near = q;
          // ring band, soft 1.2 px edges
          const band = Math.min(d - inner, rr - d) / (1.1 * k) + 0.5;
          // gaps: the ring breaks into 2–4 C-shaped pieces
          const g = Math.sin(r.gk * th + r.gp) + 0.55 * Math.sin((r.gk + 1) * th + r.gp * 1.7);
          const dg = r.gk * Math.cos(r.gk * th + r.gp) + 0.55 * (r.gk + 1) * Math.cos((r.gk + 1) * th + r.gp * 1.7);
          const gap = clamp((g - r.gt) / Math.max(Math.abs(dg), 0.6) * d / (1.2 * k) + 0.5);
          ring = Math.max(ring, clamp(band) * gap);
          core = Math.max(core, clamp((inner - d) / (1.5 * k) + 0.5));
        }
        // small solid spots between rosettes
        let spot = 0;
        if (near > 1.25) {
          const si = Math.floor(wx / S2), sj = Math.floor(wy / S2);
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const a = si + di, b = sj + dj;
            if (hash(a, b, seed + 9) > 0.42) continue;
            const sx = (a + 0.5 + 0.5 * (hash(a, b, seed + 10) - 0.5)) * S2, sy = (b + 0.5 + 0.5 * (hash(a, b, seed + 11) - 0.5)) * S2;
            const sr = S2 * (0.12 + 0.12 * hash(a, b, seed + 12));
            const d = Math.hypot(wx - sx, (wy - sy) * 1.25);
            spot = Math.max(spot, clamp((sr - d) / (1.1 * k) + 0.5) * clamp((near - 1.25) * 4));
          }
        }
        // ground: warm tan with soft fur-like shading
        const n = fbm(x / (260 * k), y / (260 * k), seed + 120, 3), fine = vnoise(x / (3.2 * k), y / (9 * k), seed + 7);
        let R = mix(184, 226, n) + (fine - 0.5) * 10, G = mix(124, 164, n) + (fine - 0.5) * 8, B = mix(62, 92, n) + (fine - 0.5) * 6;
        // rosette core: deeper amber
        R = mix(R, 150, core * 0.85); G = mix(G, 86, core * 0.85); B = mix(B, 36, core * 0.85);
        const ink = Math.max(ring, spot);
        R = mix(R, 26, ink); G = mix(G, 17, ink); B = mix(B, 11, ink);
        const o = (y * W + x) * 4;
        px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  function zebra(W, H, seed) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); const px = img.data;
    const k = W / 1080;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n1 = fbm(x / (420 * k), y / (420 * k), seed, 3), n2 = fbm(x / (160 * k), y / (160 * k), seed + 30, 2);
      const u = x + (n1 - 0.5) * 190 * k + (n2 - 0.5) * 36 * k;
      const v = Math.sin((u + y * 0.34) / (21 * k) + n1 * 5);
      const t = clamp((v + 0.12 + (n2 - 0.5) * 0.7) * 9 + 0.5);
      const c = mix(241, 14, t);
      const o = (y * W + x) * 4;
      px[o] = c; px[o + 1] = c - 3 * (1 - t); px[o + 2] = c - 8 * (1 - t); px[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  // A Sicilian maiolica tile, 240 × 240. Quarter medallions at the corners join into circles across tiles.
  function majolicaSVG() {
    const C = '#1C3C8F', Y = '#E5A527', G = '#2F7A4E', W = '#F4EFE1', D = '#0F2563';
    let petals = '', inner = '', leaves = '', dots = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45;
      petals += `<ellipse cx="120" cy="74" rx="15" ry="34" fill="${C}" transform="rotate(${a} 120 120)"/>`;
      inner += `<ellipse cx="120" cy="86" rx="6.5" ry="17" fill="${Y}" transform="rotate(${a + 22.5} 120 120)"/>`;
      dots += `<circle cx="120" cy="34" r="4.5" fill="${D}" transform="rotate(${a + 22.5} 120 120)"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const a = 45 + i * 90;
      leaves += `<ellipse cx="120" cy="22" rx="9" ry="20" fill="${G}" transform="rotate(${a} 120 120)"/>`;
      leaves += `<path d="M120 -6 L128 8 L120 22 L112 8 Z" fill="${C}" transform="rotate(${i * 90} 120 120)"/>`;
    }
    const corner = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="60" fill="${C}"/><circle cx="${cx}" cy="${cy}" r="47" fill="${Y}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="31" fill="${W}"/><circle cx="${cx}" cy="${cy}" r="19" fill="${C}"/><circle cx="${cx}" cy="${cy}" r="7" fill="${Y}"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">` +
      `<rect width="240" height="240" fill="${W}"/>` +
      corner(0, 0) + corner(240, 0) + corner(0, 240) + corner(240, 240) +
      `<circle cx="120" cy="120" r="92" fill="none" stroke="${C}" stroke-width="3"/>` +
      `<circle cx="120" cy="120" r="84" fill="none" stroke="${Y}" stroke-width="5"/>` +
      leaves + dots + petals + inner +
      `<circle cx="120" cy="120" r="22" fill="${Y}"/><circle cx="120" cy="120" r="13" fill="${C}"/><circle cx="120" cy="120" r="5" fill="${W}"/>` +
      `<rect x="0.5" y="0.5" width="239" height="239" fill="none" stroke="#d9d0bb" stroke-width="1"/>` +
      `</svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  window.DGPrints = { leopard, zebra, majolicaSVG };
})();
