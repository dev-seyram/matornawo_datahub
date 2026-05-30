import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'public', 'og-source.png');
const outJpg = path.join(root, 'public', 'og-image.jpg');
const outPng = path.join(root, 'public', 'og-image.png');

const MAX_BYTES = 280_000; // WhatsApp / Facebook link previews work best under ~300 KB

if (!fs.existsSync(source)) {
  console.error('Missing public/og-source.png');
  process.exit(1);
}

const base = sharp(source).resize(1200, 630, { fit: 'cover', position: 'centre' });

let quality = 85;
let jpgBuffer = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
while (jpgBuffer.length > MAX_BYTES && quality > 55) {
  quality -= 5;
  jpgBuffer = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
}

fs.writeFileSync(outJpg, jpgBuffer);

// Lightweight PNG fallback (palette) for environments that prefer .png
const pngBuffer = await base
  .clone()
  .png({ compressionLevel: 9, palette: true, quality: 80 })
  .toBuffer();
fs.writeFileSync(outPng, pngBuffer.length <= MAX_BYTES ? pngBuffer : jpgBuffer);

console.log(
  `Generated og-image.jpg (${Math.round(jpgBuffer.length / 1024)} KB, q=${quality})` +
    ` and og-image.png (${Math.round(fs.statSync(outPng).size / 1024)} KB)`
);
