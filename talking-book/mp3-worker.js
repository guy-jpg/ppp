/* Compresses the WAV audio that Gemini returns into MP3 before it is stored for offline listening
   (about 10 times smaller). Runs off the main thread so playback never stutters. */
importScripts('vendor/lamejs.iife.js');

function readWav(buf) {
  const v = new DataView(buf);
  let off = 12, rate = 24000, channels = 1, dataOff = -1, dataLen = 0;
  while (off + 8 <= v.byteLength) {
    const id = String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
    const size = v.getUint32(off + 4, true);
    if (id === 'fmt ') { channels = v.getUint16(off + 10, true); rate = v.getUint32(off + 12, true); }
    if (id === 'data') { dataOff = off + 8; dataLen = Math.min(size, v.byteLength - dataOff); break; }
    off += 8 + size + (size & 1);
  }
  if (dataOff < 0 || channels !== 1) throw new Error('unsupported wav');
  const samples = dataOff % 2 === 0
    ? new Int16Array(buf, dataOff, dataLen >> 1)
    : new Int16Array(buf.slice(dataOff, dataOff + (dataLen & ~1)));
  return { rate, samples };
}

self.onmessage = (e) => {
  const { id, wav } = e.data;
  try {
    const { rate, samples } = readWav(wav);
    const enc = new lamejs.Mp3Encoder(1, rate, 48);
    const parts = [];
    let total = 0;
    for (let i = 0; i < samples.length; i += 1152) {
      const b = enc.encodeBuffer(samples.subarray(i, i + 1152));
      if (b.length) { parts.push(b); total += b.length; }
    }
    const f = enc.flush();
    if (f.length) { parts.push(f); total += f.length; }
    const out = new Uint8Array(total);
    let p = 0;
    for (const b of parts) { out.set(b, p); p += b.length; }
    self.postMessage({ id, mp3: out.buffer }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, mp3: null, error: String(err) });
  }
};
