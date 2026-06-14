/* מחולל אייקונים – יוצר קובצי PNG לאפליקציה (Android/iOS) ללא תלויות חיצוניות.
   הרצה: node tools/gen-icons.js  (מתוך תיקיית daily-routine)
   מצייר רקע אינדיגו עם שמש (עיגול + קרניים) בגוון חם – בהתאם לאייקון 🌅 של האפליקציה. */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'www', 'icons');
fs.mkdirSync(OUT, { recursive: true });

/* ---- CRC32 ל-PNG ---- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  // scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- ציור האייקון ---- */
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function draw(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size * 0.46;
  const sunR = size * 0.20;
  const safe = maskable ? 0.10 : 0; // שוליים בטוחים לאייקון maskable
  const radius = size * (maskable ? 0.5 : 0.22); // פינות מעוגלות (לא למסקבל)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // פינות מעוגלות (רק כשלא maskable)
      let inside = true;
      if (!maskable) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < radius && ry < radius) {
          const dx = radius - rx, dy = radius - ry;
          if (dx * dx + dy * dy > radius * radius) inside = false;
        }
      }
      if (!inside) { buf[i + 3] = 0; continue; }

      // רקע גרדיאנט אנכי: אינדיגו כהה -> אינדיגו בהיר
      const t = y / size;
      let r = lerp(0x31, 0x63, t);
      let g = lerp(0x2e, 0x66, t);
      let b = lerp(0x81, 0xf1, t);
      let a = 255;

      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // קרני שמש
      const ang = Math.atan2(dy, dx);
      const rayInner = sunR * 1.35, rayOuter = sunR * 1.95;
      if (dist > rayInner && dist < rayOuter) {
        const seg = (ang + Math.PI) / (Math.PI / 6); // 12 קרניים
        if (Math.abs(seg - Math.round(seg)) < 0.18) {
          r = 0xfb; g = 0xbf; b = 0x24;
        }
      }
      // גוף השמש
      if (dist < sunR) {
        const k = dist / sunR;
        r = lerp(0xfd, 0xf5, k); g = lerp(0xe0, 0x9e, k); b = lerp(0x68, 0x0b, k);
      }

      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    }
  }
  return encodePNG(size, size, buf);
}

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];
for (const t of targets) {
  fs.writeFileSync(path.join(OUT, t.name), draw(t.size, t.maskable));
  console.log('נוצר', t.name);
}
