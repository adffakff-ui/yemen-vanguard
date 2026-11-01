import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, isMaskable = false) {
  // Compute scanlines (RGBA)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const radiusOuter = width * (isMaskable ? 0.35 : 0.42);
  const radiusInner = width * (isMaskable ? 0.18 : 0.22);
  const radiusCore = width * (isMaskable ? 0.05 : 0.06);
  const lineWidth = Math.max(2, Math.round(width * 0.035));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Default background #0c0e12
      let r = 12, g = 14, b = 18, a = 255;

      // Outer golden radar circle
      if (Math.abs(dist - radiusOuter) <= lineWidth) {
        r = 245; g = 158; b = 11;
      }
      // Inner emerald radar circle
      else if (Math.abs(dist - radiusInner) <= lineWidth * 0.75) {
        r = 16; g = 185; b = 129;
      }
      // Crosshair lines
      else if (
        ((Math.abs(dx) <= lineWidth * 0.6 && dist >= radiusInner * 0.5 && dist <= radiusOuter * 1.1) ||
         (Math.abs(dy) <= lineWidth * 0.6 && dist >= radiusInner * 0.5 && dist <= radiusOuter * 1.1))
      ) {
        r = 245; g = 158; b = 11;
      }
      // Red target center dot
      else if (dist <= radiusCore) {
        r = 239; g = 68; b = 68;
      }

      scanlines[pixelOffset] = r;
      scanlines[pixelOffset + 1] = g;
      scanlines[pixelOffset + 2] = b;
      scanlines[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(scanlines, { level: 9 });

  // Helper to build chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Standard CRC32 table
  function crc32(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // Color type 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = chunk('IHDR', ihdrData);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate CRC table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, false));

console.log('PNG and ICO PWA icons generated successfully.');
