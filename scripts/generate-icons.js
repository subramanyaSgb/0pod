/**
 * Generate PNG icon files for PWA from the SVG icon.
 *
 * Usage:
 *   node scripts/generate-icons.js
 *
 * If the `canvas` or `sharp` packages are available, this script will render
 * the SVG at the required sizes. Otherwise it creates minimal valid PNG files
 * with a solid dark background and the "0" glyph — good enough for PWA
 * installability until a proper build-pipeline icon generator is set up.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'apps', 'web', 'public');

// ---- Minimal PNG encoder (uncompressed RGBA) ----

function crc32(buf) {
  let c;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, payload, crc]);
}

function createPNG(width, height, rgba) {
  // Build raw image data with filter byte 0 (None) per row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: None
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Draw a simple iPod-like icon into an RGBA buffer ----

function fillRect(buf, w, _h, x0, y0, rw, rh, r, g, b, a) {
  for (let y = y0; y < y0 + rh && y < _h; y++) {
    for (let x = x0; x < x0 + rw && x < w; x++) {
      const i = (y * w + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }
}

function fillCircle(buf, w, h, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(h - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(w - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const i = (y * w + x) * 4;
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = a;
      }
    }
  }
}

function fillRoundedRect(buf, w, h, x0, y0, rw, rh, cornerR, r, g, b, a) {
  for (let y = y0; y < y0 + rh && y < h; y++) {
    for (let x = x0; x < x0 + rw && x < w; x++) {
      // Check corners
      let inside = true;
      const corners = [
        [x0 + cornerR, y0 + cornerR],
        [x0 + rw - cornerR, y0 + cornerR],
        [x0 + cornerR, y0 + rh - cornerR],
        [x0 + rw - cornerR, y0 + rh - cornerR],
      ];
      if (x < x0 + cornerR && y < y0 + cornerR) {
        const dx = x - corners[0][0], dy = y - corners[0][1];
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (x >= x0 + rw - cornerR && y < y0 + cornerR) {
        const dx = x - corners[1][0], dy = y - corners[1][1];
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (x < x0 + cornerR && y >= y0 + rh - cornerR) {
        const dx = x - corners[2][0], dy = y - corners[2][1];
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      } else if (x >= x0 + rw - cornerR && y >= y0 + rh - cornerR) {
        const dx = x - corners[3][0], dy = y - corners[3][1];
        if (dx * dx + dy * dy > cornerR * cornerR) inside = false;
      }
      if (inside) {
        const i = (y * w + x) * 4;
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = a;
      }
    }
  }
}

function generateIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size / 512; // scale factor

  // Background #1A1A1A with rounded corners
  fillRoundedRect(buf, size, size, 0, 0, size, size, Math.round(96 * s), 0x1a, 0x1a, 0x1a, 255);

  // iPod body — silver #C0C0C0
  const bx = Math.round(136 * s), by = Math.round(56 * s);
  const bw = Math.round(240 * s), bh = Math.round(400 * s);
  fillRoundedRect(buf, size, size, bx, by, bw, bh, Math.round(24 * s), 0xc0, 0xc0, 0xc0, 255);

  // Screen #E8E6D9
  const sx = Math.round(168 * s), sy = Math.round(88 * s);
  const sw = Math.round(176 * s), sh = Math.round(132 * s);
  fillRoundedRect(buf, size, size, sx, sy, sw, sh, Math.round(8 * s), 0xe8, 0xe6, 0xd9, 255);

  // Click wheel — white
  const cx = Math.round(256 * s), cy = Math.round(324 * s);
  fillCircle(buf, size, size, cx, cy, Math.round(88 * s), 0xff, 0xff, 0xff, 255);

  // Center button
  fillCircle(buf, size, size, cx, cy, Math.round(32 * s), 0xf0, 0xf0, 0xf0, 255);

  return createPNG(size, size, buf);
}

// Generate both sizes
for (const size of [192, 512]) {
  const png = generateIcon(size);
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
}
