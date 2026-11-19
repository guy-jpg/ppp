'use strict';
/* הספר המדבר: turns any text into an audiobook. Plain JS, no build step.
   Two voice engines:
   - Google Cloud Text-to-Speech: natural voices, real MP3 audio that keeps playing with the screen
     off, shows on the lock screen, and can be saved ahead for listening offline.
   - The device's own speechSynthesis: free and instant, quality depends on the device. */

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const nf = new Intl.NumberFormat('he-IL');
const WORD = /[\p{L}\p{N}]/u;
const DEFAULT_CPS = 14;     // characters per second of speech at 1x; refined from real audio
const PIECE_CHARS = 1300;   // text per Google request (limit is 5000 bytes; Hebrew is 2 bytes per letter)
const PREFETCH = 3;         // pieces generated ahead of the one playing
const SPEEDS = [0.75, 0.9, 1, 1.1, 1.2, 1.3, 1.5, 1.75, 2, 2.5];
const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAACQAABCAARUVFRUVFRUVFRUVdXV1dXV1dXV1dXXR0dHR0dHR0dHR0i4uLi4uLi4uLi4uioqKioqKioqKiorq6urq6urq6urq60dHR0dHR0dHR0dHo6Ojo6Ojo6Ojo6P//////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQD8AAAAAAAAAQgDeb0IwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
const SAMPLE_LINE = 'שלום! אני הקול שיקריא לך את הספרים. אפשר להתרווח, לשים אוזניות, ולהקשיב.';

const ICONS = {
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/>',
  dots: '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>',
  plus: '<path d="M11 4h2v16h-2zM4 11h16v2H4z" fill="currentColor"/>',
};
const svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function btn(label, cls, fn) { const b = el('button', cls, label); b.type = 'button'; b.onclick = fn; return b; }
function note(text) { return el('p', 'muted', text); }
function optBtn(label, on, hint) {
  const b = el('button', 'opt' + (on ? ' on' : ''));
  b.type = 'button';
  b.append(el('span', 'opt-label', label));
  if (hint) b.append(el('span', 'opt-hint', hint));
  return b;
}
function fmtDur(sec) {
  if (!isFinite(sec) || sec < 0) return '';
  const m = Math.round(sec / 60);
  if (m < 1) return 'פחות מדקה';
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} שע׳ ${mm} דק׳` : `${h} שע׳`;
}
const fmtRate = (r) => `${Math.round(r * 100) / 100}×`;
const mb = (b) => (b < 1048576 ? 'פחות מ־1MB' : `${nf.format(Math.round(b / 1048576))}MB`);
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function upperBound(arr, x) { // first index whose value is > x
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) lo = m + 1; else hi = m; }
  return lo;
}

// ---------- settings ----------
const settings = Object.assign(
  { engine: 'device', gKey: '', gVoice: '', gVoices: [], deviceVoice: '', rate: 1, cps: {}, theme: 'system', lastBook: null },
  lsGet('tb:settings', {})
);
const saveSettings = () => lsSet('tb:settings', settings);
const useGoogle = () => settings.engine === 'google' && !!settings.gKey;
const voiceId = () => (useGoogle() ? 'g:' + (settings.gVoice || 'default') : 'd:' + (settings.deviceVoice || 'auto'));
const cps = () => settings.cps[voiceId()] || DEFAULT_CPS;

// ---------- storage (IndexedDB: books, texts, audio) ----------
const DB = (() => {
  let dbp = null;
  const done = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  function open() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('talking-book', 1);
        r.onupgradeneeded = () => {
          const db = r.result;
          db.createObjectStore('books', { keyPath: 'id' });
          db.createObjectStore('texts');
          db.createObjectStore('audio').createIndex('book', 'book');
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => { dbp = null; rej(r.error); };
      });
    }
    return dbp;
  }
  const os = async (name, mode = 'readonly') => (await open()).transaction(name, mode).objectStore(name);
  return {
    get: async (s, k) => done((await os(s)).get(k)),
    put: async (s, v, k) => { const st = await os(s, 'readwrite'); return done(k === undefined ? st.put(v) : st.put(v, k)); },
    del: async (s, k) => done((await os(s, 'readwrite')).delete(k)),
    all: async (s) => done((await os(s)).getAll()),
    clear: async (s) => done((await os(s, 'readwrite')).clear()),
    keys: async (s) => done((await os(s)).getAllKeys()),
    audioKeys: async (book) => done((await os('audio')).index('book').getAllKeys(book)),
  };
})();

// ---------- turning text into sentences, chapters and audio pieces ----------
const HEAD_RE = /^(?:פרק|חלק|chapter|part)\s+(?:\d{1,3}|[א-ת]{1,2}['׳"״]?[א-ת]?|ראשון|שני|שלישי|רביעי|חמישי|שישי|שביעי|שמיני|תשיעי|עשירי|[ivxlc]{1,7}|one|two|three|four|five|six|seven|eight|nine|ten)(?=$|[\s:.\-–—])/i;
const HEAD_WORDS = /^(?:פרולוג|אפילוג|הקדמה|מבוא|אחרית[\s-]דבר|סוף[\s-]דבר|תודות|prologue|epilogue|introduction|preface)[:.]?$/i;

function headingOf(line) {
  if (/^#{1,3}\s+\S/.test(line)) return line.replace(/^#{1,3}\s+/, '').trim();
  if (line.length > 60 || /[,;]$/.test(line)) return null;
  if (/^\d{1,3}\.?$/.test(line)) return line.replace('.', '');
  if (HEAD_RE.test(line) || HEAD_WORDS.test(line)) return line.replace(/[:.]$/, '');
  return null;
}
function splitLong(s, max = 200) {
  const out = [];
  while (s.length > max) {
    const slice = s.slice(0, max);
    let cut = Math.max(slice.lastIndexOf(', '), slice.lastIndexOf('; '), slice.lastIndexOf(' – '), slice.lastIndexOf(' - '));
    if (cut < max * 0.4) cut = slice.lastIndexOf(' ');
    if (cut <= 0) cut = max;
    out.push(s.slice(0, cut + 1).trim());
    s = s.slice(cut + 1);
  }
  if (s.trim()) out.push(s.trim());
  return out;
}
function splitSentences(p) {
  const parts = p.match(/[^.!?…]+(?:[.!?…]+["'”’״)\]]*)?|[.!?…]+/g) || [p];
  const out = [];
  for (const raw of parts) { const t = raw.trim(); if (t) out.push(...splitLong(t)); }
  return out;
}
function parseBook(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/[‎‏‪-‮]/g, '').split('\n');
  const paras = [];
  let buf = '';
  const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) paras.push({ t, h: false }); buf = ''; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = headingOf(line);
    if (h !== null) { flush(); paras.push({ t: h, h: true }); continue; }
    if (buf && /[.!?…:"״”’)\]]$/.test(buf)) flush(); // a line that ended a sentence ends the paragraph
    buf += (buf ? ' ' : '') + line;                    // otherwise it is a wrapped line: join it
  }
  flush();

  const sent = [], ps = [], chapters = [];
  for (const p of paras) {
    if (p.h) {
      const last = chapters[chapters.length - 1];
      if (last && last.s === sent.length) last.title += ' · ' + p.t;
      else chapters.push({ title: p.t, s: sent.length });
    }
    let first = true;
    for (const c of p.h ? [p.t] : splitSentences(p.t)) {
      if (!WORD.test(c)) continue;
      sent.push(c);
      ps.push(first ? (p.h ? 2 : 1) : 0);
      first = false;
    }
  }
  const n = sent.length;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + sent[i].length + 1;
  const total = cum[n];
  for (const c of chapters) c.s = Math.min(c.s, Math.max(0, n - 1));
  if (chapters.length && chapters[0].s > 0) chapters.unshift({ title: 'פתיחה', s: 0 });
  if (!chapters.length && n) { // no headings: make listening-sized parts
    const step = 15000;
    let k = 1;
    chapters.push({ title: 'חלק 1', s: 0, auto: true });
    for (let i = 1; i < n; i++) if (cum[i] >= step * k) { k++; chapters.push({ title: `חלק ${k}`, s: i, auto: true }); }
  }
  const chS = chapters.map((c) => c.s);
  // Fixed audio piece boundaries, so generated audio can be cached and reused.
  const bounds = [0];
  const chSet = new Set(chS);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const len = sent[i].length + 1;
    if (i > bounds[bounds.length - 1] && (acc + len > PIECE_CHARS || chSet.has(i))) { bounds.push(i); acc = 0; }
    acc += len;
  }
  return { sent, ps: Uint8Array.from(ps), cum, total, n, chapters, chS, bounds };
}
const pieceEnd = (pb, s) => { const i = upperBound(pb.bounds, s); return i < pb.bounds.length ? pb.bounds[i] : pb.n; };
const pieceStart = (pb, s) => pb.bounds[Math.max(0, upperBound(pb.bounds, s) - 1)];
const chapterIndex = (pb, s) => Math.max(0, upperBound(pb.chS, s) - 1);
const sentenceAtChar = (pb, c) => clamp(upperBound(pb.cum, c) - 1, 0, Math.max(0, pb.n - 1));

// ---------- covers ----------
function hueOf(str) { let h = 7; for (const ch of str) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h % 360; }
function coverEl(book) {
  const d = el('div', 'cover');
  d.style.setProperty('--h', hueOf(book.title + '|' + (book.author || '')));
  const inner = el('div', 'cover-in');
  inner.append(el('span', 'cover-title', book.title));
  if (book.author) inner.append(el('span', 'cover-rule'), el('span', 'cover-author', book.author));
  d.append(inner);
  return d;
}
const artCache = new Map();
async function coverArt(book) { // a square cover for the lock screen
  if (artCache.has(book.id)) return artCache.get(book.id);
  try { await document.fonts.load('900 58px "Frank Ruhl Libre"'); } catch (e) { /* fallback font */ }
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const h = hueOf(book.title + '|' + (book.author || ''));
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, `hsl(${h}, 44%, 32%)`);
  grad.addColorStop(1, `hsl(${(h + 38) % 360}, 52%, 13%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = `hsla(${h}, 60%, 85%, 0.35)`;
  g.lineWidth = 3;
  g.strokeRect(44, 44, 424, 424);
  g.fillStyle = `hsl(${h}, 70%, 93%)`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  g.font = '900 58px "Frank Ruhl Libre", serif';
  const lines = [];
  let line = '';
  for (const w of book.title.split(/\s+/)) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > 360 && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4), lh = 66;
  const y0 = 256 - ((shown.length - 1) * lh) / 2 - (book.author ? 24 : 0);
  shown.forEach((l, i) => g.fillText(l, 256, y0 + i * lh));
  if (book.author) {
    g.font = '500 28px "Heebo", sans-serif';
    g.globalAlpha = 0.8;
    g.fillText(book.author, 256, y0 + shown.length * lh + 14);
  }
  const url = await new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : 'icons/icon-512.png'), 'image/png'));
  artCache.set(book.id, url);
  return url;
}

// ---------- toast & sheet ----------
let toastTimer;
function toast(msg, ms = 3800) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { if (!t.classList.contains('show')) t.hidden = true; }, 250); }, ms);
}
function openSheet(title, build) {
  const s = $('#sheet');
  $('#sheet-title').textContent = title;
  const body = $('#sheet-body');
  body.replaceChildren();
  build(body);
  s.hidden = false;
  requestAnimationFrame(() => s.classList.add('open'));
}
function closeSheet() {
  const s = $('#sheet');
  s.classList.remove('open');
  setTimeout(() => { if (!s.classList.contains('open')) s.hidden = true; }, 220);
}

// ---------- routing ----------
const VIEWS = ['library', 'add', 'player', 'settings'];
let navDepth = 0;
function go(v) { navDepth++; location.hash = v; }
function back() { if (navDepth > 0) { navDepth--; history.back(); } else location.hash = 'library'; }
function route() {
  let v = location.hash.slice(1) || 'library';
  if (v.startsWith('setup=')) {
    importSetup(v.slice(6));
    history.replaceState(null, '', location.pathname + location.search + '#settings');
    v = 'settings';
  }
  if (!VIEWS.includes(v) || (v === 'player' && !P.book)) v = 'library';
  for (const n of VIEWS) $('#view-' + n).hidden = n !== v;
  document.body.dataset.view = v;
  if (v === 'library') renderLibrary();
  if (v === 'settings') renderSettings();
  if (v === 'player') renderPlayer();
  updateMini();
  window.scrollTo(0, 0);
}

// ---------- player state ----------
const P = { book: null, pb: null, s: 0, playing: false, loading: false, sleep: null, textOpen: false, chIdx: -1, miniFor: null };

let saveTimer = null;
function savePos(now = false) {
  if (!P.book) return;
  P.book.posChars = P.pb ? P.pb.cum[P.s] : 0;
  const write = () => { saveTimer = null; if (P.book) DB.put('books', P.book).catch(() => {}); };
  if (now) { clearTimeout(saveTimer); write(); } else if (!saveTimer) saveTimer = setTimeout(write, 3000);
}
function setPos(s, extra) {
  if (!P.pb) return;
  P.s = clamp(s, 0, Math.max(0, P.pb.n - 1));
  P.book.pos = Object.assign({ s: P.s }, extra || {});
  if (P.sleep && P.sleep.chapterEnd != null && P.s >= P.sleep.chapterEnd) {
    P.sleep = null;
    pause();
    toast('סוף הפרק. טיימר השינה עצר את ההקראה. לילה טוב.');
    renderChips();
  }
  scheduleRender();
  savePos();
}
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderPos(); });
}
function status(msg, err) { const n = $('#p-status'); n.textContent = msg || ''; n.classList.toggle('err', !!err); }
function setLoading(v) { P.loading = v; renderPlayState(); status(v ? 'מכין את הקול…' : ''); }
function unlockAudio() { if (useGoogle()) Cloud.unlock(); else Device.prime(); }

function play() {
  if (!P.book || !P.pb || !P.pb.n) return;
  if (settings.engine === 'google' && !settings.gKey) toast('כדי להשתמש בקול של Google צריך להוסיף מפתח בהגדרות. בינתיים מקריא בקול המכשיר.', 5000);
  if (P.book.finished) { P.book.finished = false; setPos(0); Cloud.piece = null; }
  P.playing = true;
  status('');
  if (useGoogle()) {
    Device.stop();
    Cloud.unlock();
    Cloud.play(P.s);
  } else {
    Cloud.stop();
    if (!Device.supported) {
      P.playing = false;
      status('הדפדפן הזה לא יודע להקריא. חברו את הקול של Google בהגדרות.', true);
      renderPlayState();
      return;
    }
    Device.start(P.s);
  }
  renderPlayState();
  setMedia();
  P.book.opened = Date.now();
  savePos();
}
function pause() {
  P.playing = false;
  Cloud.stop();
  Device.stop();
  P.loading = false;
  renderPlayState();
  if (!$('#p-status').classList.contains('err')) status('');
  savePos(true);
}
const toggle = () => (P.playing ? pause() : play());
function jumpTo(s) {
  if (!P.pb) return;
  P.book.finished = false;
  Cloud.piece = null;
  setPos(s);
  if (P.playing) { if (useGoogle()) Cloud.play(P.s, true); else Device.start(P.s); }
  savePos(true);
}
function skip(sec) {
  if (!P.pb) return;
  if (useGoogle() && Cloud.isLoaded()) { Cloud.seekBy(sec); return; }
  const target = P.pb.cum[P.s] + sec * cps();
  jumpTo(sentenceAtChar(P.pb, clamp(target, 0, P.pb.total - 1)));
}
function prevChapter() {
  const pb = P.pb;
  if (!pb) return;
  const i = chapterIndex(pb, P.s), cur = pb.chapters[i];
  const into = pb.cum[P.s] - pb.cum[cur.s];
  jumpTo(into > 15 * cps() || i === 0 ? cur.s : pb.chapters[i - 1].s);
}
function nextChapter() {
  const pb = P.pb;
  if (!pb) return;
  const i = chapterIndex(pb, P.s);
  if (i + 1 < pb.chapters.length) jumpTo(pb.chapters[i + 1].s);
  else toast('זה הפרק האחרון.');
}
function finished() {
  P.playing = false;
  P.loading = false;
  P.book.finished = true;
  renderPlayState();
  status('סיימת את הספר. כל הכבוד!');
  savePos(true);
}

// ---------- engine 1: the device's own voices ----------
function isHebrew(v) { return /^(he|iw)/i.test(v.lang); }
function isNaturalVoice(v) { return /natural|neural|online|enhanced|premium|google/i.test(v.name + ' ' + v.voiceURI); }
function niceVoiceName(v) { return v.name.replace(/^Microsoft\s+/, '').replace(/\s*-\s*Hebrew \(Israel\)/i, '').replace(/\s*Online \(Natural\)/i, '').trim(); }
function deviceVoices() {
  if (!Device.supported) return [];
  const all = speechSynthesis.getVoices();
  const heb = all.filter(isHebrew).sort((a, b) => isNaturalVoice(b) - isNaturalVoice(a) || a.name.localeCompare(b.name));
  return heb.length ? heb : all;
}
function pickDeviceVoice() {
  const list = deviceVoices();
  return list.find((v) => v.voiceURI === settings.deviceVoice) || list.find(isHebrew) || null;
}
function applyDeviceVoice(u) {
  const v = pickDeviceVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'he-IL';
}
const Device = {
  supported: 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
  gen: 0, s: 0, active: false, stall: 0, wake: null, primed: false,
  prime() { // a silent utterance inside the tap, so phones allow speech that starts later
    if (this.primed || !this.supported) return;
    this.primed = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  },
  start(s) { this.active = true; this.s = s; this.speak(); this.lockScreen(); },
  stop() {
    if (!this.supported) return;
    const was = this.active;
    this.active = false;
    this.gen++;
    if (was) speechSynthesis.cancel();
    this.releaseScreen();
  },
  speak() {
    const pb = P.pb;
    if (!pb || this.s >= pb.n) { this.stop(); finished(); return; }
    const my = ++this.gen;
    this.stall = 0;
    setPos(this.s);
    if (!this.active || my !== this.gen) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(pb.sent[this.s]);
    applyDeviceVoice(u);
    u.rate = settings.rate;
    u.onend = () => {
      if (my !== this.gen || !this.active) return;
      this.s++;
      if (this.s >= pb.n) { this.stop(); finished(); return; }
      this.speak();
    };
    u.onerror = (e) => {
      if (my !== this.gen || !this.active) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (e.error === 'not-allowed') { pause(); status('הדפדפן חסם את ההקראה. לחצו שוב על הפעלה.', true); return; }
      this.s++;
      this.speak();
    };
    speechSynthesis.speak(u);
  },
  async lockScreen() { try { if ('wakeLock' in navigator && !this.wake) this.wake = await navigator.wakeLock.request('screen'); } catch (e) { this.wake = null; } },
  releaseScreen() { try { if (this.wake) this.wake.release(); } catch (e) { /* already released */ } this.wake = null; },
};
// Some browsers silently stop speaking mid-book; restart the current sentence if that happens.
setInterval(() => {
  if (!Device.active || !Device.supported) return;
  if (!speechSynthesis.speaking && !speechSynthesis.pending) { if (++Device.stall >= 2) Device.speak(); } else Device.stall = 0;
}, 2000);

// ---------- engine 2: Google Cloud Text-to-Speech ----------
class TTSError extends Error { constructor(status, message) { super(message); this.status = status; } }
function b64ToBuf(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function concatBufs(a, b) {
  const u = new Uint8Array(a.byteLength + b.byteLength);
  u.set(new Uint8Array(a), 0);
  u.set(new Uint8Array(b), a.byteLength);
  return u.buffer;
}
const Google = {
  base: 'https://texttospeech.googleapis.com/v1/',
  async call(url, opts) {
    if (!navigator.onLine) throw new TTSError(0, 'offline');
    let r;
    try { r = await fetch(url, opts); } catch (e) { throw new TTSError(0, 'offline'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new TTSError(r.status, (j.error && j.error.message) || r.statusText || String(r.status));
    return j;
  },
  async voices(key) {
    const j = await this.call(`${this.base}voices?languageCode=he-IL&key=${encodeURIComponent(key)}`);
    return (j.voices || []).filter((v) => (v.languageCodes || []).some((c) => /^(he|iw)/i.test(c)));
  },
  async synth(text, voice, key) {
    const j = await this.call(`${this.base}text:synthesize?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: voice ? { languageCode: 'he-IL', name: voice } : { languageCode: 'he-IL' },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });
    if (!j.audioContent) throw new TTSError(500, 'no audio');
    return b64ToBuf(j.audioContent);
  },
  async synthSafe(text, voice, key) {
    for (let attempt = 0; ; attempt++) {
      try { return await this.synth(text, voice, key); } catch (e) {
        if (e.status === 400 && /long|bytes|exceed|too/i.test(e.message) && text.length > 120) {
          const half = text.length >> 1, sp = text.lastIndexOf(' ', half), mid = sp > 0 ? sp : half;
          const a = await this.synthSafe(text.slice(0, mid), voice, key);
          const b = await this.synthSafe(text.slice(mid), voice, key);
          return concatBufs(a, b);
        }
        if ((e.status === 429 || e.status >= 500) && attempt < 3) { await wait(1500 * 2 ** attempt); continue; }
        throw e;
      }
    }
  },
};
function ttsMessage(e) {
  if (!e || e.status === undefined) return 'משהו השתבש בהשמעה. נסו שוב.';
  if (e.status === 0) return 'אין חיבור לאינטרנט, והקטע הזה עוד לא נשמר במכשיר.';
  if (e.status === 400 && /api key/i.test(e.message)) return 'המפתח של Google לא תקין. בדקו אותו בהגדרות.';
  if (e.status === 403) return 'Google סירבו לבקשה. ודאו שה־Cloud Text-to-Speech API מופעל בפרויקט ושיש לו חשבון חיוב פעיל.';
  if (e.status === 429) return 'Google מגבילים כרגע את קצב הבקשות. נסו שוב בעוד דקה.';
  return 'יצירת הקול נכשלה: ' + (e.message || e.status);
}
function tierOf(name) {
  if (/Chirp3-HD/i.test(name)) return 5;
  if (/Chirp-HD|Studio/i.test(name)) return 4;
  if (/Neural2/i.test(name)) return 3;
  if (/Wavenet/i.test(name)) return 2;
  if (/Standard/i.test(name)) return 1;
  return 2;
}
const TIER_LABEL = { 5: 'HD, הכי טבעי', 4: 'HD', 3: 'Neural2, טבעי', 2: 'WaveNet, טבעי', 1: 'בסיסי' };
function processVoices(list) {
  return list.map((v) => {
    const tier = tierOf(v.name);
    const rest = v.name.replace(/^[a-z]{2,3}-[A-Z]{2}-/, '');
    const short = tier >= 4 ? rest.split('-').pop() : rest.replace(/-/g, ' ');
    const gender = v.ssmlGender === 'FEMALE' ? 'קול נשי' : v.ssmlGender === 'MALE' ? 'קול גברי' : '';
    return { name: v.name, tier, short, hint: [TIER_LABEL[tier], gender].filter(Boolean).join(' · ') };
  }).sort((a, b) => b.tier - a.tier || a.short.localeCompare(b.short));
}

const Cloud = {
  audio: null, piece: null, url: null, token: 0, mem: new Map(), inflight: new Map(), unlocked: false, switchedAt: 0, lastSave: 0,
  init() {
    const a = (this.audio = new Audio());
    a.preload = 'auto';
    try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { /* older browsers */ }
    a.addEventListener('ended', () => this.onEnded());
    a.addEventListener('timeupdate', () => this.onTime());
    a.addEventListener('pause', () => { // paused from outside: headphones unplugged, a call, the OS
      if (!P.playing || !useGoogle() || !this.piece || a.ended || P.loading || Date.now() - this.switchedAt < 1500) return;
      P.playing = false;
      renderPlayState();
      savePos(true);
    });
  },
  unlock() { // play a moment of silence inside the tap, so the real audio may start after it loads
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.isLoaded()) return;
    this.audio.src = SILENT;
    const p = this.audio.play();
    if (p) p.catch(() => {});
  },
  ctx() { return { book: P.book, pb: P.pb, voice: settings.gVoice || 'default', gVoice: settings.gVoice, key: settings.gKey }; },
  key(ctx, s, e) { return `${ctx.book.id}|${ctx.voice}|${s}|${e}`; },
  isLoaded() { return !!(this.piece && P.book && this.piece.book === P.book.id && this.audio.src.startsWith('blob:')); },
  async get(ctx, s, e) {
    const k = this.key(ctx, s, e);
    if (this.mem.has(k)) return this.mem.get(k);
    if (this.inflight.has(k)) return this.inflight.get(k);
    const job = (async () => {
      let buf = null;
      try { const rec = await DB.get('audio', k); buf = rec && rec.buf; } catch (err) { /* not cached */ }
      if (!buf) {
        const text = ctx.pb.sent.slice(s, e).join(' ');
        buf = await Google.synthSafe(text, ctx.gVoice, ctx.key);
        DB.put('audio', { book: ctx.book.id, buf }, k).catch(() => {});
      }
      this.mem.set(k, buf);
      while (this.mem.size > 8) this.mem.delete(this.mem.keys().next().value);
      return buf;
    })();
    this.inflight.set(k, job);
    try { return await job; } finally { this.inflight.delete(k); }
  },
  async play(s, fresh = false) {
    if (!P.pb) return;
    const a = this.audio;
    if (!fresh && this.isLoaded() && this.piece.voice === (settings.gVoice || 'default') && s >= this.piece.s && s < this.piece.e) {
      a.playbackRate = settings.rate;
      try { await a.play(); } catch (err) { this.fail(err); }
      return;
    }
    const pos = P.book.pos;
    const resume = !fresh && pos && pos.p0 != null && pos.s === s && pos.p0 <= s ? pos : null;
    const p0 = resume ? resume.p0 : s;
    await this.load(p0, pieceEnd(P.pb, p0), resume ? resume.t || 0 : 0);
  },
  async load(s, e, t = 0) {
    const my = ++this.token;
    const ctx = this.ctx();
    this.piece = null;
    setLoading(true);
    let buf;
    try { buf = await this.get(ctx, s, e); } catch (err) { if (my === this.token) this.fail(err); return; }
    if (my !== this.token) return;
    if (!P.playing) { setLoading(false); return; }
    const a = this.audio;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    this.piece = { book: ctx.book.id, voice: ctx.voice, s, e, chars: ctx.pb.cum[e] - ctx.pb.cum[s] };
    this.switchedAt = Date.now();
    a.src = this.url;
    if (t) {
      await new Promise((res) => { if (a.readyState >= 1) res(); else a.addEventListener('loadedmetadata', res, { once: true }); });
      if (my !== this.token) return;
      try { a.currentTime = t < 0 ? Math.max(0, a.duration + t) : Math.min(t, Math.max(0, a.duration - 0.5)); } catch (err) { /* keep 0 */ }
    }
    a.playbackRate = settings.rate;
    try { await a.play(); } catch (err) { if (my === this.token) this.fail(err); return; }
    a.playbackRate = settings.rate;
    if (my !== this.token) return;
    setLoading(false);
    this.prefetch(ctx, e, my);
  },
  async prefetch(ctx, from, my) {
    let s = from;
    for (let k = 0; k < PREFETCH && s < ctx.pb.n; k++) {
      if (my !== this.token) return;
      const e = pieceEnd(ctx.pb, s);
      try { await this.get(ctx, s, e); } catch (err) { return; }
      s = e;
    }
  },
  onEnded() {
    const pc = this.piece, a = this.audio;
    if (!pc || !P.playing || !P.pb || pc.book !== P.book.id) return;
    if (isFinite(a.duration) && a.duration > 2) {
      const id = voiceId(), measured = clamp(pc.chars / a.duration, 7, 25); // guard against odd audio
      settings.cps[id] = settings.cps[id] ? settings.cps[id] * 0.8 + measured * 0.2 : measured;
      saveSettings();
    }
    this.cleanup(pc.s);
    if (pc.e >= P.pb.n) { setPos(P.pb.n - 1); finished(); return; }
    setPos(pc.e);
    if (!P.playing) return;
    this.load(pc.e, pieceEnd(P.pb, pc.e), 0);
  },
  onTime() {
    const pc = this.piece, a = this.audio;
    if (!pc || !P.pb || pc.book !== P.book.id || !isFinite(a.duration) || !a.duration) return;
    const frac = clamp(a.currentTime / a.duration, 0, 1);
    const s = clamp(sentenceAtChar(P.pb, P.pb.cum[pc.s] + frac * pc.chars), pc.s, pc.e - 1);
    if (s !== P.s || Date.now() - this.lastSave > 4000) {
      this.lastSave = Date.now();
      setPos(s, { p0: pc.s, t: a.currentTime });
    }
    updateMediaPosition();
  },
  seekBy(sec) {
    const a = this.audio, pc = this.piece;
    const t = a.currentTime + sec;
    if (t >= 0 && t < a.duration - 0.3) { a.currentTime = t; this.onTime(); return; }
    if (t < 0) {
      if (pc.s === 0) { a.currentTime = 0; this.onTime(); return; }
      this.goto(pieceStart(P.pb, pc.s - 1), t); // negative t: counted back from the end
      return;
    }
    if (pc.e >= P.pb.n) { a.currentTime = Math.max(0, a.duration - 0.3); return; }
    this.goto(pc.e, t - a.duration);
  },
  goto(s, t) {
    setPos(s);
    if (P.playing) this.load(s, pieceEnd(P.pb, s), t);
    else { this.piece = null; P.book.pos = { s: P.s }; }
  },
  stop() {
    this.token++;
    try { this.audio.pause(); } catch (e) { /* nothing loaded */ }
  },
  fail(err) {
    if (err && err.name === 'AbortError') return;
    P.playing = false;
    P.loading = false;
    renderPlayState();
    const msg = err && err.name === 'NotAllowedError' ? 'הדפדפן ביקש לחיצה כדי להתחיל לנגן. לחצו על הפעלה.' : ttsMessage(err);
    status(msg, true);
    toast(msg, 6000);
    savePos(true);
  },
  playOneOff(buf) {
    this.token++;
    this.piece = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }));
    this.audio.src = this.url;
    this.audio.playbackRate = 1;
    this.audio.play().catch(() => toast('לחצו שוב על "השמעת דוגמה".'));
  },
  async cleanup(beforeS) { // drop audio of pieces already listened to, keep the last one for "back 15s"
    try {
      const keys = await DB.audioKeys(P.book.id);
      for (const k of keys) { const e = +String(k).split('|')[3]; if (e <= beforeS) DB.del('audio', k); }
    } catch (e) { /* ignore */ }
  },
  async download(minutes, onProgress, ref) {
    const ctx = this.ctx(), pb = ctx.pb;
    let s = P.book.pos && P.book.pos.p0 != null ? P.book.pos.p0 : P.s;
    const startC = pb.cum[s];
    const endC = Math.min(pb.total, startC + (minutes === Infinity ? Infinity : minutes * 60 * cps()));
    while (s < pb.n && pb.cum[s] < endC) {
      if (ref.cancel) return 'cancel';
      const e = pieceEnd(pb, s);
      await this.get(ctx, s, e);
      s = e;
      onProgress(Math.min(1, (pb.cum[s] - startC) / Math.max(1, endC - startC)));
    }
    return 'done';
  },
};

// ---------- lock screen / headphone controls ----------
function setMedia() {
  if (!('mediaSession' in navigator) || !P.book || typeof MediaMetadata === 'undefined') return;
  const ch = P.pb && P.pb.chapters[chapterIndex(P.pb, P.s)];
  const meta = {
    title: ch && !ch.auto ? ch.title : P.book.title,
    artist: P.book.author || 'הספר המדבר',
    album: P.book.title,
    artwork: [{ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }],
  };
  try { navigator.mediaSession.metadata = new MediaMetadata(meta); } catch (e) { return; }
  const id = P.book.id;
  coverArt(P.book).then((src) => {
    if (!P.book || P.book.id !== id) return;
    try { navigator.mediaSession.metadata = new MediaMetadata(Object.assign({}, meta, { artwork: [{ src, sizes: '512x512', type: 'image/png' }] })); } catch (e) { /* keep icon */ }
  });
}
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const h = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (e) { /* unsupported action */ } };
  h('play', () => play());
  h('pause', () => pause());
  h('stop', () => pause());
  h('seekbackward', (d) => skip(-((d && d.seekOffset) || 15)));
  h('seekforward', (d) => skip((d && d.seekOffset) || 30));
  h('seekto', (d) => { if (P.pb && d && isFinite(d.seekTime)) jumpTo(sentenceAtChar(P.pb, d.seekTime * cps())); });
}
let lastMediaPos = 0;
function updateMediaPosition() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState || !P.pb) return;
  if (Date.now() - lastMediaPos < 1000) return;
  lastMediaPos = Date.now();
  const k = cps();
  const duration = Math.max(1, P.pb.total / k);
  let position = P.pb.cum[P.s] / k;
  const a = Cloud.audio;
  if (Cloud.isLoaded() && isFinite(a.duration) && a.duration) position = (P.pb.cum[Cloud.piece.s] + Cloud.piece.chars * (a.currentTime / a.duration)) / k;
  try { navigator.mediaSession.setPositionState({ duration, position: clamp(position, 0, duration), playbackRate: settings.rate }); } catch (e) { /* ignore */ }
}

// ---------- sleep timer ----------
setInterval(() => {
  if (!P.sleep || !P.sleep.until) return;
  if (Date.now() >= P.sleep.until) {
    P.sleep = null;
    if (P.playing) { pause(); toast('טיימר השינה עצר את ההקראה. לילה טוב.'); }
  }
  renderChips();
}, 1000);
function setSleep(v) {
  if (!v) P.sleep = null;
  else if (v === 'ch') { const next = P.pb.chapters[chapterIndex(P.pb, P.s) + 1]; P.sleep = { chapterEnd: next ? next.s : P.pb.n }; }
  else P.sleep = { until: Date.now() + v * 60000 };
  renderChips();
  if (v) toast(v === 'ch' ? 'ההקראה תיעצר בסוף הפרק.' : `ההקראה תיעצר בעוד ${v} דקות.`);
}

// ---------- player rendering ----------
let seeking = false;
function setFill(r) { r.style.setProperty('--fill', (r.value / r.max) * 100 + '%'); }
function renderPlayState() {
  const icon = P.playing ? ICONS.pause : ICONS.play;
  $('#p-play-icon').innerHTML = icon;
  $('#mini-play-icon').innerHTML = icon;
  const label = P.playing ? 'השהיה' : 'הפעלה';
  $('#p-play').setAttribute('aria-label', label);
  $('#mini-play').setAttribute('aria-label', label);
  $('#p-play').classList.toggle('loading', P.loading);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = P.playing ? 'playing' : 'paused';
}
function voiceLabel() {
  if (useGoogle()) { const v = settings.gVoices.find((x) => x.name === settings.gVoice); return v ? v.short : 'Google'; }
  const d = pickDeviceVoice();
  return d ? niceVoiceName(d) : 'קול המכשיר';
}
function renderChips() {
  $('#chip-speed span').textContent = fmtRate(settings.rate);
  const sl = $('#chip-sleep');
  sl.classList.toggle('on', !!P.sleep);
  sl.querySelector('span').textContent = !P.sleep ? 'טיימר שינה' : P.sleep.until ? `עוד ${Math.max(1, Math.ceil((P.sleep.until - Date.now()) / 60000))} דק׳` : 'בסוף הפרק';
  $('#chip-voice span').textContent = voiceLabel();
  $('#chip-text').classList.toggle('on', P.textOpen);
}
function renderPos() {
  if (!P.pb || !P.book) return;
  const pb = P.pb;
  const frac = pb.total ? pb.cum[P.s] / pb.total : 0;
  const pct = P.book.finished ? 100 : Math.floor(frac * 100);
  const ci = chapterIndex(pb, P.s), ch = pb.chapters[ci];
  if (!seeking) { const sk = $('#p-seek'); sk.value = Math.round(frac * 1000); setFill(sk); $('#p-chapter').textContent = ch ? ch.title : ''; }
  $('#p-pct').textContent = `${pct}%`;
  $('#p-left').textContent = P.book.finished ? 'הסתיים' : `נותרו ${fmtDur((pb.total - pb.cum[P.s]) / (cps() * settings.rate))}`;
  $('#mini-fill').style.width = pct + '%';
  $('#mini-sub').textContent = `${ch ? ch.title + ' · ' : ''}${pct}%`;
  if (ci !== P.chIdx) { P.chIdx = ci; setMedia(); }
  renderText();
  updateMediaPosition();
}
const TV = { from: -1, to: -1, cur: -1, user: 0 };
function renderText(force) {
  const box = $('#p-text');
  if (!P.pb || !box.offsetParent) return;
  const pb = P.pb, s = P.s;
  if (force || TV.from < 0 || s < TV.from + 5 || s > TV.to - 25) {
    TV.from = Math.max(0, s - 30);
    TV.to = Math.min(pb.n, s + 170);
    const frag = document.createDocumentFragment();
    let p = null;
    for (let i = TV.from; i < TV.to; i++) {
      const ps = pb.ps[i];
      if (!p || ps) { p = document.createElement(ps === 2 ? 'h3' : 'p'); frag.append(p); }
      const sp = el('span', null, pb.sent[i] + ' ');
      sp.dataset.i = i;
      p.append(sp);
    }
    box.replaceChildren(frag);
    TV.cur = -1;
  }
  if (TV.cur !== s) {
    const first = TV.cur < 0;
    const old = box.querySelector('.now');
    if (old) old.classList.remove('now');
    const cur = box.querySelector(`span[data-i="${s}"]`);
    if (cur) {
      cur.classList.add('now');
      if (Date.now() - TV.user > 5000) box.scrollTo({ top: cur.offsetTop - box.clientHeight / 2 + cur.offsetHeight / 2, behavior: first ? 'auto' : 'smooth' });
    }
    TV.cur = s;
  }
}
function toggleText() {
  P.textOpen = !P.textOpen;
  $('#p-text').classList.toggle('closed', !P.textOpen);
  document.body.dataset.text = P.textOpen ? 'open' : '';
  TV.user = 0;
  renderChips();
  renderText(true);
}
function renderPlayer() {
  if (!P.book) return;
  $('#p-cover-wrap').replaceChildren(coverEl(P.book));
  $('#p-title').textContent = P.book.title;
  document.body.dataset.text = P.textOpen ? 'open' : '';
  renderChips();
  renderPlayState();
  P.chIdx = -1;
  TV.from = -1;
  renderPos();
}
function updateMini() {
  const show = !!P.book && document.body.dataset.view !== 'player';
  $('#mini').hidden = !show;
  if (!show) return;
  if (P.miniFor !== P.book.id + P.book.title) {
    P.miniFor = P.book.id + P.book.title;
    $('#mini-cover').replaceChildren(coverEl(P.book));
  }
  $('#mini-title').textContent = P.book.title;
  renderPlayState();
  renderPos();
}

// ---------- sheets: speed, sleep, voice, chapters, more, download ----------
function openSpeed() {
  openSheet('מהירות הקראה', (body) => {
    const grid = el('div', 'chip-grid');
    for (const r of SPEEDS) {
      const b = optBtn(fmtRate(r), r === settings.rate);
      b.onclick = () => { setRate(r); closeSheet(); };
      grid.append(b);
    }
    body.append(grid);
  });
}
function setRate(r) {
  settings.rate = r;
  saveSettings();
  Cloud.audio.playbackRate = r;
  if (Device.active) Device.speak();
  renderChips();
  scheduleRender();
}
function openSleep() {
  const items = [{ v: 0, l: 'כבוי' }, ...[10, 20, 30, 45, 60, 90].map((m) => ({ v: m, l: `בעוד ${m} דקות` })), { v: 'ch', l: 'בסוף הפרק הנוכחי' }];
  const cur = !P.sleep ? 0 : P.sleep.until ? null : 'ch';
  openSheet('טיימר שינה', (body) => {
    const list = el('div', 'opt-list');
    for (const it of items) {
      const b = optBtn(it.l, it.v === cur);
      b.onclick = () => { setSleep(it.v); closeSheet(); };
      list.append(b);
    }
    body.append(list);
  });
}
function openVoice() {
  openSheet('הקול שמקריא', (body) => {
    const list = el('div', 'opt-list');
    if (settings.gKey) {
      list.append(el('div', 'opt-group', 'קולות טבעיים של Google'));
      const gv = settings.gVoices.length ? settings.gVoices : [{ name: '', short: 'ברירת המחדל', hint: '' }];
      for (const v of gv) {
        const b = optBtn(v.short, settings.engine === 'google' && settings.gVoice === v.name, v.hint);
        b.onclick = () => { closeSheet(); switchVoice('google', v.name); };
        list.append(b);
      }
    }
    list.append(el('div', 'opt-group', 'קולות המכשיר'));
    const dv = deviceVoices();
    if (!dv.length) list.append(note('לא נמצאו קולות במכשיר הזה.'));
    const curD = pickDeviceVoice();
    for (const v of dv.slice(0, 40)) {
      const b = optBtn(niceVoiceName(v), !useGoogle() && curD === v, isNaturalVoice(v) ? 'טבעי' : '');
      b.onclick = () => { closeSheet(); switchVoice('device', v.voiceURI); };
      list.append(b);
    }
    body.append(list);
    if (!settings.gKey) body.append(note('לקול שנשמע כמו קריין אמיתי, חברו את Google בהגדרות.'), btn('לחיבור הקול', 'btn primary wide', () => { closeSheet(); go('settings'); }));
  });
}
function switchVoice(engine, id) {
  const was = P.playing;
  if (was) pause();
  settings.engine = engine;
  if (engine === 'google') settings.gVoice = id; else settings.deviceVoice = id;
  saveSettings();
  Cloud.piece = null;
  renderChips();
  scheduleRender();
  if (was) { unlockAudio(); play(); }
}
function openChapters() {
  const pb = P.pb, cur = chapterIndex(pb, P.s);
  openSheet('פרקים', (body) => {
    const list = el('div', 'opt-list');
    pb.chapters.forEach((c, i) => {
      const next = pb.chapters[i + 1];
      const len = ((next ? pb.cum[next.s] : pb.total) - pb.cum[c.s]) / (cps() * settings.rate);
      const b = optBtn(c.title, i === cur, fmtDur(len));
      b.onclick = () => { unlockAudio(); closeSheet(); jumpTo(c.s); };
      list.append(b);
    });
    body.append(list);
    requestAnimationFrame(() => { const n = list.children[cur]; if (n) n.scrollIntoView({ block: 'center' }); });
  });
}
function openMore() {
  if (!P.book) return;
  openSheet(P.book.title, (body) => {
    const list = el('div', 'opt-list');
    const add = (label, fn, hint) => { const b = optBtn(label, false, hint); b.onclick = fn; list.append(b); };
    add('פרקים', openChapters, nf.format(P.pb.chapters.length));
    add('הורדה לנסיעה, להאזנה בלי אינטרנט', openDownload);
    add('חזרה לתחילת הספר', () => { closeSheet(); jumpTo(0); });
    add('שינוי שם ומחבר', () => renameBook(P.book));
    body.append(list);
  });
}
function openDownload() {
  if (!useGoogle()) {
    openSheet('הורדה לנסיעה', (body) => {
      body.append(note('הורדה מראש עובדת עם הקול של Google. קול המכשיר לא צריך אינטרנט בכלל, אבל בטלפון הוא נעצר כשהמסך נכבה.'));
      body.append(btn('לחיבור Google', 'btn primary wide', () => { closeSheet(); go('settings'); }));
    });
    return;
  }
  const left = P.pb.total - P.pb.cum[P.s];
  const opts = [[30, 'חצי שעה'], [60, 'שעה'], [120, 'שעתיים'], [300, '5 שעות'], [Infinity, 'עד סוף הספר']];
  openSheet('הורדה לנסיעה', (body) => {
    body.append(note('האודיו יישמר במכשיר, ותוכלו להקשיב גם בלי קליטה, למשל ברכבת. כדאי להוריד כשיש Wi-Fi.'));
    const list = el('div', 'opt-list');
    for (const [m, l] of opts) {
      const chars = m === Infinity ? left : Math.min(left, m * 60 * cps());
      const b = optBtn(l, false, `${nf.format(Math.max(1, Math.round(chars / 1000)))} אלף תווים`);
      b.onclick = () => runDownload(m, body);
      list.append(b);
    }
    body.append(list);
  });
}
async function runDownload(minutes, body) {
  const ref = { cancel: false };
  body.replaceChildren();
  const label = note('מוריד… אפשר להמשיך להאזין בינתיים. אל תסגרו את האתר עד הסוף.');
  const bar = el('div', 'progress-line');
  const fill = el('i');
  bar.append(fill);
  const cancel = btn('ביטול ההורדה', 'btn ghost wide', () => { ref.cancel = true; });
  body.append(label, bar, cancel);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
  try {
    const r = await Cloud.download(minutes, (f) => { fill.style.setProperty('--p', Math.round(f * 100) + '%'); label.textContent = `מוריד… ${Math.round(f * 100)}%`; }, ref);
    if (r === 'done') {
      label.textContent = 'ההורדה הסתיימה. אפשר להקשיב גם בלי אינטרנט.';
      toast('ההורדה לנסיעה הסתיימה.');
    } else label.textContent = 'ההורדה בוטלה. מה שכבר ירד נשאר שמור.';
  } catch (e) { label.textContent = ttsMessage(e); }
  cancel.textContent = 'סגירה';
  cancel.onclick = closeSheet;
}

// ---------- library ----------
function progressOf(b) {
  const pct = b.finished ? 100 : b.chars ? Math.min(100, Math.floor(((b.posChars || 0) / b.chars) * 100)) : 0;
  const left = Math.max(0, b.chars - (b.posChars || 0)) / (cps() * settings.rate);
  return { pct, left };
}
async function renderLibrary() {
  let books = [];
  try { books = await DB.all('books'); } catch (e) { toast('הדפדפן חוסם שמירה במכשיר, ולכן הספרייה לא נשמרת. אם אתם בגלישה בסתר, פתחו חלון רגיל.', 7000); }
  books = books.map((b) => (P.book && P.book.id === b.id ? P.book : b)).sort((a, b) => (b.opened || b.created) - (a.opened || a.created));
  const shelf = $('#shelf');
  shelf.replaceChildren(addTile(), ...books.map(bookTile));
  $('#shelf-count').textContent = books.length === 1 ? 'ספר אחד' : books.length ? `${nf.format(books.length)} ספרים` : '';
  renderContinue(books[0]);
  $('#engine-banner').hidden = useGoogle();
}
function addTile() {
  const t = el('div', 'tile');
  const b = el('button', 'tile-open');
  b.type = 'button';
  b.innerHTML = `<div class="cover add-cover">${svg(ICONS.plus)}<span>ספר חדש</span></div><span class="tile-meta"><strong>הוספת ספר</strong><span class="muted">קובץ או הדבקת טקסט</span></span>`;
  b.onclick = () => go('add');
  t.append(b);
  return t;
}
function bookTile(b) {
  const t = el('div', 'tile');
  const open = el('button', 'tile-open');
  open.type = 'button';
  open.setAttribute('aria-label', `פתיחת ${b.title}`);
  const { pct, left } = progressOf(b);
  const meta = el('span', 'tile-meta');
  const bar = el('span', 'bar');
  const fillI = el('i');
  fillI.style.setProperty('--p', pct + '%');
  bar.append(fillI);
  meta.append(el('strong', null, b.title), bar, el('span', 'muted', b.finished ? 'הסתיים' : pct ? `${pct}% · נותרו ${fmtDur(left)}` : `${fmtDur(left)} האזנה`));
  open.append(coverEl(b), meta);
  open.onclick = async () => { if (await openBook(b.id)) go('player'); };
  const menu = el('button', 'tile-menu');
  menu.type = 'button';
  menu.setAttribute('aria-label', `אפשרויות עבור ${b.title}`);
  menu.innerHTML = svg(ICONS.dots);
  menu.onclick = () => bookMenu(b);
  t.append(open, menu);
  return t;
}
function renderContinue(b) {
  const box = $('#continue');
  if (!b) { box.hidden = true; return; }
  const { pct, left } = progressOf(b);
  const started = pct > 0 && !b.finished;
  const mid = el('div');
  const bar = el('span', 'bar');
  const fillI = el('i');
  fillI.style.setProperty('--p', pct + '%');
  bar.append(fillI);
  mid.append(
    el('span', 'eyebrow', started ? 'להמשיך להאזין' : b.finished ? 'סיימת להאזין' : 'מוכן להאזנה'),
    el('h2', null, b.title),
    el('p', 'sub', [b.author, started ? `${pct}% · נותרו ${fmtDur(left)}` : `${fmtDur(left)} האזנה`].filter(Boolean).join(' · ')),
    bar
  );
  const label = started ? 'המשך האזנה' : 'האזנה';
  const playB = el('button', 'play-lg');
  playB.type = 'button';
  playB.innerHTML = svg(ICONS.play);
  playB.setAttribute('aria-label', label);
  playB.dataset.label = label;
  playB.onclick = async () => { unlockAudio(); if (await openBook(b.id)) { go('player'); play(); } };
  const cov = coverEl(b);
  cov.style.cursor = 'pointer';
  cov.onclick = async () => { if (await openBook(b.id)) go('player'); };
  box.replaceChildren(cov, mid, playB);
  box.hidden = false;
}
function bookMenu(b) {
  openSheet(b.title, (body) => {
    const list = el('div', 'opt-list');
    const rn = optBtn('שינוי שם ומחבר');
    rn.onclick = () => renameBook(b);
    const rs = optBtn('התחלה מההתחלה');
    rs.onclick = async () => { await updateBook(b.id, { pos: { s: 0 }, posChars: 0, finished: false }); closeSheet(); renderLibrary(); toast('הספר יתחיל מההתחלה.'); };
    const del = optBtn('מחיקת הספר');
    del.style.color = 'var(--danger)';
    del.onclick = () => confirmDelete(b);
    list.append(rn, rs, del);
    body.append(list);
  });
}
function confirmDelete(b) {
  openSheet('למחוק את הספר?', (body) => {
    body.append(note(`"${b.title}" יימחק מהמכשיר הזה, יחד עם המקום שבו עצרתם והאודיו השמור. אי אפשר לבטל את זה.`));
    body.append(btn('מחיקה', 'btn danger wide', async () => { await deleteBook(b.id); closeSheet(); toast('הספר נמחק.'); }));
  });
}
async function deleteBook(id) {
  if (P.book && P.book.id === id) {
    pause();
    P.book = null; P.pb = null; Cloud.piece = null;
    settings.lastBook = null;
    saveSettings();
  }
  await DB.del('books', id).catch(() => {});
  await DB.del('texts', id).catch(() => {});
  try { for (const k of await DB.audioKeys(id)) await DB.del('audio', k); } catch (e) { /* ignore */ }
  renderLibrary();
  updateMini();
}
function field(label, value, id) {
  const wrap = el('label', 'field');
  wrap.htmlFor = id;
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value;
  wrap.append(el('span', null, label), input);
  return { wrap, input };
}
function renameBook(b) {
  openSheet('שינוי שם', (body) => {
    const t = field('שם הספר', b.title, 'rn-title');
    const a = field('מחבר', b.author || '', 'rn-author');
    body.append(t.wrap, a.wrap, btn('שמירה', 'btn primary wide', async () => {
      await updateBook(b.id, { title: t.input.value.trim() || b.title, author: a.input.value.trim() });
      artCache.delete(b.id);
      closeSheet();
      if (document.body.dataset.view === 'player') renderPlayer(); else renderLibrary();
      updateMini();
      setMedia();
      toast('נשמר.');
    }));
  });
}
async function updateBook(id, patch) {
  if (P.book && P.book.id === id) {
    if (patch.pos && P.playing) pause();
    Object.assign(P.book, patch);
    if (patch.pos) { P.s = patch.pos.s; Cloud.piece = null; scheduleRender(); }
    await DB.put('books', P.book);
    return;
  }
  const b = await DB.get('books', id);
  if (!b) return;
  Object.assign(b, patch);
  await DB.put('books', b);
}
async function openBook(id) {
  if (P.book && P.book.id === id) return true;
  if (P.playing) pause();
  let book, text;
  try { book = await DB.get('books', id); text = await DB.get('texts', id); } catch (e) { return false; }
  if (!book) return false;
  P.book = book;
  P.pb = parseBook(text || '');
  P.s = clamp((book.pos && book.pos.s) || 0, 0, Math.max(0, P.pb.n - 1));
  P.sleep = null;
  P.chIdx = -1;
  Cloud.piece = null;
  TV.from = -1;
  settings.lastBook = id;
  saveSettings();
  setMedia();
  return true;
}

// ---------- adding a book ----------
const Add = { text: null };
const PASTE_HINT = 'הדביקו כאן את הטקסט של הספר. אין הגבלת אורך.';
function resetAdd() {
  Add.text = null;
  const ta = $('#add-text');
  ta.value = '';
  ta.disabled = false;
  ta.placeholder = PASTE_HINT;
  $('#add-title').value = '';
  $('#add-author').value = '';
  $('#file-card').hidden = true;
  $('#drop').hidden = false;
  addStats();
}
function addStats() {
  const text = Add.text != null ? Add.text : $('#add-text').value;
  const chars = text.trim().length;
  $('#add-stats').textContent = chars ? `כ־${nf.format(Math.max(1, Math.round(chars / 1800)))} עמודים · ${fmtDur(chars / DEFAULT_CPS)} האזנה` : '';
}
const scripts = {};
function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => { delete scripts[src]; rej(new Error('load ' + src)); };
      document.head.append(s);
    });
  }
  return scripts[src];
}
function decodeText(buf) {
  const t = new TextDecoder('utf-8').decode(buf);
  return t.includes('�') ? new TextDecoder('windows-1255').decode(buf) : t;
}
function fixReversedHebrew(text) { // some Hebrew PDFs store text in visual order, i.e. backwards
  const rev = (text.match(/(?:^|\s)[םןץףך][א-ת]/g) || []).length;
  const norm = (text.match(/[א-ת][םןץףך](?=[\s.,!?:;"״]|$)/g) || []).length;
  if (rev <= norm) return text;
  const mirror = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
  return text.split('\n').map((line) => [...line].reverse().join('')
    .replace(/[A-Za-z0-9][A-Za-z0-9.,:%/-]*[A-Za-z0-9]/g, (m) => [...m].reverse().join(''))
    .replace(/[()[\]{}<>]/g, (c) => mirror[c])).join('\n');
}
async function readPdf(buf) {
  await loadScript('vendor/pdf.min.js');
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    $('#add-stats').textContent = `קורא עמוד ${nf.format(n)} מתוך ${nf.format(pdf.numPages)}…`;
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    let s = '';
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      s += it.str;
      s += it.hasEOL ? '\n' : it.str && !it.str.endsWith(' ') ? ' ' : '';
    }
    pages.push(s.split('\n').filter((l) => !/^\s*\d{1,4}\s*$/.test(l)).join('\n')); // drop page numbers
    page.cleanup();
  }
  const text = pages.join('\n');
  if (text.replace(/\s/g, '').length < pdf.numPages * 20) throw new Error('scanned');
  return fixReversedHebrew(text);
}
function resolvePath(dir, href) {
  const out = [];
  for (const seg of (dir + href).split('/')) { if (seg === '..') out.pop(); else if (seg && seg !== '.') out.push(seg); }
  return out.join('/');
}
function htmlToText(root) {
  let out = '';
  const BLOCK = /^(P|DIV|SECTION|ARTICLE|LI|BLOCKQUOTE|BR|TR|H4|H5|H6|PRE)$/;
  (function walk(n) {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) out += c.nodeValue.replace(/\s+/g, ' ');
      else if (c.nodeType === 1) {
        const tag = c.tagName.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE') continue;
        if (/^H[1-3]$/.test(tag)) { const t = c.textContent.replace(/\s+/g, ' ').trim(); if (t) out += `\n\n# ${t}\n\n`; continue; }
        const block = BLOCK.test(tag);
        if (block) out += '\n\n';
        walk(c);
        if (block) out += '\n\n';
      }
    }
  })(root);
  return out;
}
async function readEpub(buf) {
  await loadScript('vendor/jszip.min.js');
  const zip = await window.JSZip.loadAsync(buf);
  const container = await zip.file('META-INF/container.xml').async('string');
  const opfPath = /full-path="([^"]+)"/.exec(container)[1];
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const opf = new DOMParser().parseFromString(await zip.file(opfPath).async('string'), 'application/xml');
  const tag = (name) => opf.getElementsByTagNameNS('*', name);
  const title = (tag('title')[0] && tag('title')[0].textContent.trim()) || '';
  const author = (tag('creator')[0] && tag('creator')[0].textContent.trim()) || '';
  const manifest = {};
  for (const it of tag('item')) manifest[it.getAttribute('id')] = it.getAttribute('href');
  const parts = [];
  const refs = [...tag('itemref')];
  for (let i = 0; i < refs.length; i++) {
    $('#add-stats').textContent = `קורא את הספר… ${Math.round(((i + 1) / refs.length) * 100)}%`;
    const href = manifest[refs[i].getAttribute('idref')];
    if (!href) continue;
    const f = zip.file(resolvePath(opfDir, decodeURIComponent(href.split('#')[0])));
    if (!f) continue;
    const doc = new DOMParser().parseFromString(await f.async('string'), 'text/html');
    if (doc.body) parts.push(htmlToText(doc.body));
  }
  return { text: parts.join('\n\n'), title, author };
}
async function readDocx(buf) {
  await loadScript('vendor/mammoth.browser.min.js');
  const r = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return r.value;
}
async function importFile(file) {
  $('#add-stats').textContent = 'קורא את הקובץ…';
  try {
    const buf = await file.arrayBuffer();
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    let res;
    if (/\.epub$/i.test(file.name)) res = await readEpub(buf);
    else if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') res = { text: await readPdf(buf) };
    else if (/\.docx$/i.test(file.name)) res = { text: await readDocx(buf) };
    else res = { text: decodeText(buf) };
    const text = (res.text || '').trim();
    if (!text) throw new Error('empty');
    Add.text = text;
    if (!$('#add-title').value) $('#add-title').value = res.title || name;
    if (!$('#add-author').value && res.author) $('#add-author').value = res.author;
    $('#file-name').textContent = file.name;
    $('#file-info').textContent = `${nf.format(text.length)} תווים נקראו מהקובץ`;
    $('#file-card').hidden = false;
    $('#drop').hidden = true;
    const ta = $('#add-text');
    ta.value = '';
    ta.disabled = true;
    ta.placeholder = 'הטקסט נטען מהקובץ. כדי להדביק טקסט אחר, הסירו את הקובץ.';
    addStats();
  } catch (e) {
    console.error(e);
    $('#add-stats').textContent = '';
    toast(e.message === 'scanned'
      ? 'זה נראה כמו PDF סרוק (תמונות של עמודים), ואין בו טקסט שאפשר לקרוא.'
      : 'לא הצלחתי לקרוא את הקובץ. אפשר לפתוח אותו, להעתיק את הטקסט ולהדביק כאן.', 7000);
  }
}
async function saveNewBook() {
  const text = (Add.text != null ? Add.text : $('#add-text').value).trim();
  if (!text) { toast('קודם מדביקים טקסט או בוחרים קובץ.'); $('#add-text').focus(); return; }
  const pb = parseBook(text);
  if (!pb.n) { toast('לא מצאתי בטקסט מילים שאפשר לקרוא.'); return; }
  let title = $('#add-title').value.trim();
  if (!title) { const first = pb.sent[0] || ''; title = first.length > 40 ? first.slice(0, 40).replace(/\s+\S*$/, '') + '…' : first; }
  const book = { id: uid(), title: title || 'ספר ללא שם', author: $('#add-author').value.trim(), created: Date.now(), opened: Date.now(), chars: pb.total, posChars: 0, pos: { s: 0 }, finished: false };
  try {
    await DB.put('texts', text, book.id);
    await DB.put('books', book);
  } catch (e) { toast('לא הצלחתי לשמור את הספר. ייתכן שהאחסון במכשיר מלא.'); return; }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
  if (P.playing) pause();
  Object.assign(P, { book, pb, s: 0, sleep: null, chIdx: -1 });
  Cloud.piece = null;
  TV.from = -1;
  settings.lastBook = book.id;
  saveSettings();
  setMedia();
  resetAdd();
  toast('הספר נוסף לספרייה. לחצו על הפעלה כדי להתחיל.');
  navDepth = Math.max(0, navDepth - 1);
  location.replace('#player');
}

// ---------- settings ----------
function applyTheme() {
  if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', settings.theme);
}
function renderSettings() {
  $('#eng-google').checked = settings.engine === 'google';
  $('#eng-device').checked = settings.engine !== 'google';
  $('#g-key').value = settings.gKey;
  const st = $('#g-status');
  st.textContent = settings.gKey ? (settings.gVoices.length ? `מחובר · ${settings.gVoices.length} קולות בעברית` : 'המפתח שמור') : '';
  st.className = settings.gKey ? 'ok' : '';
  $('#g-link-out').hidden = true;
  fillGoogleVoices();
  fillDeviceVoices();
  $('#theme').value = settings.theme;
  storageInfo();
}
function fillGoogleVoices() {
  const sel = $('#g-voice');
  sel.replaceChildren();
  if (!settings.gVoices.length) { sel.add(new Option('יופיעו אחרי הבדיקה', '')); sel.disabled = true; return; }
  sel.disabled = false;
  for (const v of settings.gVoices) sel.add(new Option(`${v.short} · ${v.hint}`, v.name));
  sel.value = settings.gVoice;
}
function deviceTip(list) {
  if (!Device.supported) return 'הדפדפן הזה לא תומך בהקראה. אפשר לחבר את Google למעלה.';
  const heb = list.filter(isHebrew);
  if (heb.some(isNaturalVoice)) return 'יש במכשיר הזה קול עברי טבעי.';
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isEdge = /Edg\//.test(ua);
  const base = heb.length ? 'הקול העברי במכשיר הזה רובוטי. ' : 'אין במכשיר הזה קול בעברית. ';
  if (isIOS) return base + 'אפשר להוריד קול משופר: הגדרות ← נגישות ← תוכן מוקרא ← קולות ← עברית ← כרמית (משופר). או לחבר את Google למעלה.';
  if (/Android/.test(ua)) return base + 'אפשר להתקין את הקול של Google: הגדרות ← המרת טקסט לדיבור ← Google ← התקנת נתוני קול ← עברית. או לחבר את Google למעלה.';
  if (isMac && !isEdge) return base + 'במק: פתחו את האתר ב־Microsoft Edge כדי לקבל את הקולות אברי והילה, או חברו את Google למעלה.';
  if (!isEdge) return base + 'פתחו את האתר ב־Microsoft Edge כדי לקבל קולות טבעיים, או חברו את Google למעלה.';
  return base + 'ב־Edge הקולות הטבעיים צריכים אינטרנט. רעננו את הדף, או חברו את Google למעלה.';
}
function fillDeviceVoices() {
  const sel = $('#d-voice');
  sel.replaceChildren();
  const list = deviceVoices();
  $('#d-tip').textContent = deviceTip(list);
  if (!Device.supported) { sel.add(new Option('לא זמין בדפדפן הזה', '')); sel.disabled = true; return; }
  sel.disabled = false;
  const best = list.find(isHebrew);
  sel.add(new Option(best ? `אוטומטי (${niceVoiceName(best)})` : 'אוטומטי', ''));
  for (const v of list) sel.add(new Option(niceVoiceName(v) + (isNaturalVoice(v) ? ' · טבעי' : ''), v.voiceURI));
  sel.value = list.some((v) => v.voiceURI === settings.deviceVoice) ? settings.deviceVoice : '';
}
function setEngine(v) {
  const was = P.playing;
  if (was) pause();
  settings.engine = v;
  saveSettings();
  Cloud.piece = null;
  if (v === 'google' && !settings.gKey) {
    const st = $('#g-status');
    st.textContent = 'הדביקו את המפתח ולחצו "שמירה ובדיקה".';
    st.className = '';
    $('#g-key').focus();
  }
  renderChips();
}
async function checkGoogle() {
  const key = $('#g-key').value.trim();
  const st = $('#g-status');
  if (!key) { st.textContent = 'הדביקו קודם את המפתח.'; st.className = 'err'; return; }
  st.textContent = 'בודק…';
  st.className = '';
  try {
    const voices = processVoices(await Google.voices(key));
    if (!voices.length) throw new TTSError(-1, 'no hebrew voices');
    Object.assign(settings, { gKey: key, gVoices: voices, engine: 'google' });
    if (!voices.some((v) => v.name === settings.gVoice)) settings.gVoice = voices[0].name;
    saveSettings();
    Cloud.piece = null;
    $('#eng-google').checked = true;
    fillGoogleVoices();
    renderChips();
    st.textContent = `מחובר · ${voices.length} קולות בעברית. משמיע דוגמה…`;
    st.className = 'ok';
    await testGoogle();
  } catch (e) {
    st.textContent = e.status === -1 ? 'המפתח עובד, אבל לא נמצאו קולות בעברית.' : ttsMessage(e);
    st.className = 'err';
  }
}
async function testGoogle() {
  if (!settings.gKey) { toast('קודם מחברים מפתח.'); return; }
  Cloud.unlock();
  if (P.playing) pause();
  try {
    Cloud.playOneOff(await Google.synthSafe(SAMPLE_LINE, settings.gVoice, settings.gKey));
    const st = $('#g-status');
    st.textContent = `מחובר · ${settings.gVoices.length || ''} קולות בעברית`.replace(' ·  ', ' · ');
    st.className = 'ok';
  } catch (e) {
    const st = $('#g-status');
    st.textContent = ttsMessage(e);
    st.className = 'err';
  }
}
function testDevice() {
  if (!Device.supported) return;
  if (P.playing) pause();
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(SAMPLE_LINE);
  applyDeviceVoice(u);
  u.rate = settings.rate;
  speechSynthesis.speak(u);
}
function setupLink() {
  if (!settings.gKey) { toast('קודם מחברים מפתח.'); return; }
  const payload = btoa(JSON.stringify({ k: settings.gKey, v: settings.gVoice }));
  const url = location.href.split('#')[0] + '#setup=' + encodeURIComponent(payload);
  const out = $('#g-link-out');
  out.value = url;
  out.hidden = false;
  const manual = () => { out.focus(); out.select(); toast('סמנו והעתיקו את הקישור שמופיע למטה.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => toast('הקישור הועתק. שלחו אותו לעצמכם ופתחו בטלפון.'), manual);
  else manual();
}
function importSetup(raw) {
  try {
    const d = JSON.parse(atob(decodeURIComponent(raw)));
    if (!d.k) throw new Error('no key');
    Object.assign(settings, { gKey: d.k, gVoice: d.v || '', engine: 'google' });
    saveSettings();
    toast('החיבור לקולות של Google נשמר במכשיר הזה.');
    refreshGoogleVoices();
  } catch (e) { toast('הקישור לא תקין. העתיקו אותו שוב מהמחשב.'); }
}
async function refreshGoogleVoices() {
  try {
    settings.gVoices = processVoices(await Google.voices(settings.gKey));
    if (settings.gVoices.length && !settings.gVoices.some((v) => v.name === settings.gVoice)) settings.gVoice = settings.gVoices[0].name;
    saveSettings();
    if (document.body.dataset.view === 'settings') renderSettings();
    renderChips();
  } catch (e) { /* offline; try again next time */ }
}
async function storageInfo() {
  const out = $('#storage-info');
  try {
    const keys = await DB.keys('audio');
    let usage = '';
    if (navigator.storage && navigator.storage.estimate) usage = ` · בשימוש: ${mb((await navigator.storage.estimate()).usage || 0)}`;
    out.textContent = `${nf.format(keys.length)} קטעי אודיו שמורים${usage}`;
  } catch (e) { out.textContent = ''; }
}
async function clearAudio() {
  try { await DB.clear('audio'); } catch (e) { /* ignore */ }
  Cloud.mem.clear();
  storageInfo();
  toast('האודיו השמור נמחק. הספרים והמקום שבו עצרתם נשארו.');
}

// ---------- sample book ----------
const SAMPLE_TEXT = `# איך זה עובד
ברוכים הבאים להספר המדבר. זה ספר קצר לדוגמה, כדי שתשמעו איך ההקראה נשמעת לפני שמוסיפים ספר אמיתי.
מוסיפים ספר בלחיצה על "ספר חדש": בוחרים קובץ, או מדביקים את הטקסט. אין הגבלת אורך, גם ספר של אלף עמודים יעבוד.

# שליטה בהאזנה
הכפתורים במסך הנגן מדלגים חמש עשרה שניות אחורה או שלושים שניות קדימה, ועוברים בין פרקים. אפשר להאיץ את הקריאה, להפעיל טיימר שינה, ולפתוח את הטקסט כדי לעקוב אחרי המשפט שמוקרא.
האתר זוכר בדיוק איפה עצרתם בכל ספר. סוגרים, חוזרים, ולוחצים על המשך.

# קול טבעי
קול המכשיר עובד מיד ובחינם, אבל האיכות שלו תלויה במכשיר. כדי לקבל קול שנשמע כמו קריין אמיתי, וממשיך לנגן גם כשהמסך כבוי, מחברים את הקולות של Google במסך ההגדרות. עושים את זה פעם אחת.
אחרי החיבור אפשר גם להוריד פרקים מראש, ולהקשיב ברכבת בלי קליטה. האזנה נעימה!`;
async function seedSample() {
  if (lsGet('tb:seeded', false)) return;
  const books = await DB.all('books');
  if (!books.length) {
    const pb = parseBook(SAMPLE_TEXT);
    const book = { id: 'sample', title: 'ספר לדוגמה', author: 'הספר המדבר', created: Date.now(), opened: Date.now(), chars: pb.total, posChars: 0, pos: { s: 0 }, finished: false };
    await DB.put('texts', SAMPLE_TEXT, book.id);
    await DB.put('books', book);
    if (!settings.lastBook) { settings.lastBook = book.id; saveSettings(); }
  }
  lsSet('tb:seeded', true);
}

// ---------- wiring ----------
function bindUI() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) { back(); return; }
    const g = e.target.closest('[data-go]');
    if (g) go(g.dataset.go);
  });
  $('#open-settings').onclick = () => go('settings');

  // add book
  $('#add-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; });
  const drop = $('#drop');
  for (const t of ['dragenter', 'dragover']) drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); });
  for (const t of ['dragleave', 'drop']) drop.addEventListener(t, () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  $('#file-remove').onclick = () => {
    Add.text = null;
    $('#file-card').hidden = true;
    $('#drop').hidden = false;
    const ta = $('#add-text');
    ta.disabled = false;
    ta.placeholder = PASTE_HINT;
    addStats();
  };
  let statT;
  $('#add-text').addEventListener('input', () => { clearTimeout(statT); statT = setTimeout(addStats, 250); });
  $('#add-save').onclick = saveNewBook;

  // player
  $('#p-play').onclick = () => { unlockAudio(); toggle(); };
  $('#mini-play').onclick = () => { unlockAudio(); toggle(); };
  $('#mini-open').onclick = () => go('player');
  $('#p-back').onclick = () => skip(-15);
  $('#p-fwd').onclick = () => skip(30);
  $('#p-prevch').onclick = () => { unlockAudio(); prevChapter(); };
  $('#p-nextch').onclick = () => { unlockAudio(); nextChapter(); };
  $('#p-chapter').onclick = openChapters;
  $('#chip-speed').onclick = openSpeed;
  $('#chip-sleep').onclick = openSleep;
  $('#chip-voice').onclick = openVoice;
  $('#chip-text').onclick = toggleText;
  $('#p-more').onclick = openMore;
  const seek = $('#p-seek');
  const seekTarget = () => sentenceAtChar(P.pb, (seek.value / 1000) * P.pb.total);
  seek.addEventListener('input', () => {
    if (!P.pb) return;
    seeking = true;
    setFill(seek);
    const ch = P.pb.chapters[chapterIndex(P.pb, seekTarget())];
    $('#p-pct').textContent = `${Math.floor(seek.value / 10)}%`;
    $('#p-chapter').textContent = ch ? ch.title : '';
  });
  seek.addEventListener('change', () => { if (!P.pb) return; seeking = false; unlockAudio(); jumpTo(seekTarget()); });
  const box = $('#p-text');
  for (const t of ['wheel', 'touchstart', 'pointerdown']) box.addEventListener(t, () => { TV.user = Date.now(); }, { passive: true });
  box.addEventListener('click', (e) => {
    const sp = e.target.closest('span[data-i]');
    if (!sp) return;
    unlockAudio();
    TV.user = 0;
    jumpTo(+sp.dataset.i);
    if (!P.playing) play();
  });

  // sheet & keyboard
  $('#sheet-close').onclick = closeSheet;
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#sheet').hidden) { closeSheet(); return; }
    if (e.target.matches('input, textarea, select, button') && e.code === 'Space') return;
    if (e.target.matches('input, textarea, select') || document.body.dataset.view !== 'player') return;
    if (e.code === 'Space') { e.preventDefault(); unlockAudio(); toggle(); }
    else if (e.key === 'ArrowRight') skip(-15);
    else if (e.key === 'ArrowLeft') skip(30);
  });

  // settings
  for (const r of document.querySelectorAll('input[name="engine"]')) r.addEventListener('change', () => setEngine(r.value));
  $('#g-key-show').onclick = () => {
    const k = $('#g-key');
    const show = k.type === 'password';
    k.type = show ? 'text' : 'password';
    $('#g-key-show').textContent = show ? 'הסתרה' : 'הצגה';
  };
  $('#g-check').onclick = () => { Cloud.unlock(); checkGoogle(); };
  $('#g-voice').onchange = (e) => { switchVoice('google', e.target.value); };
  $('#g-test').onclick = testGoogle;
  $('#g-link').onclick = setupLink;
  $('#d-voice').onchange = (e) => { settings.deviceVoice = e.target.value; saveSettings(); renderChips(); };
  $('#d-test').onclick = testDevice;
  $('#theme').onchange = (e) => { settings.theme = e.target.value; saveSettings(); applyTheme(); };
  $('#clear-audio').onclick = clearAudio;

  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', () => savePos(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) savePos(true);
    else if (Device.active) Device.lockScreen();
  });
  if (Device.supported) {
    const onVoices = () => { if (document.body.dataset.view === 'settings') fillDeviceVoices(); renderChips(); };
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', onVoices);
    else speechSynthesis.onvoiceschanged = onVoices;
  }
}

async function init() {
  applyTheme();
  Cloud.init();
  initMediaSession();
  bindUI();
  try { await seedSample(); } catch (e) { /* storage blocked */ }
  if (settings.lastBook) { try { await openBook(settings.lastBook); } catch (e) { /* book gone */ } }
  route();
  if (settings.gKey && !settings.gVoices.length) refreshGoogleVoices();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
init();
