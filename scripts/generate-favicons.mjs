import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import toIco from 'to-ico';

const root = path.resolve(import.meta.dirname, '..');
// Vector mark reads clearly at 16–32px; full 3D logo (favicon-source.png) does not.
const source = path.join(root, 'public', 'favicon.svg');

if (!fs.existsSync(source)) {
  console.error('Missing public/favicon.svg');
  process.exit(1);
}

const raster = (size) =>
  sharp(source, { density: Math.max(192, size * 8) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png();

const outPng = path.join(root, 'public', 'favicon.png');
const outApple = path.join(root, 'public', 'apple-touch-icon.png');
const outIco = path.join(root, 'public', 'favicon.ico');

await raster(32).toFile(outPng);
await raster(180).toFile(outApple);

const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(icoSizes.map((size) => raster(size).toBuffer()));
fs.writeFileSync(outIco, await toIco(icoBuffers));

console.log('Generated favicon.png, apple-touch-icon.png, favicon.ico from favicon.svg');
