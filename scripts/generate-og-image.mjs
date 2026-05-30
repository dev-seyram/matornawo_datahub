import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'public', 'og-source.png');
const out = path.join(root, 'public', 'og-image.png');

if (!fs.existsSync(source)) {
  console.error('Missing public/og-source.png');
  process.exit(1);
}

await sharp(source)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log('Generated public/og-image.png (1200×630)');
