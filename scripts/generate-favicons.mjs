import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import toIco from 'to-ico';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'public', 'favicon-source.png');

if (!fs.existsSync(source)) {
  console.error('Missing public/favicon-source.png');
  process.exit(1);
}

const outPng = path.join(root, 'public', 'favicon.png');
const outApple = path.join(root, 'public', 'apple-touch-icon.png');
const outIco = path.join(root, 'public', 'favicon.ico');

await sharp(source).resize(32, 32, { fit: 'cover' }).png().toFile(outPng);
await sharp(source).resize(180, 180, { fit: 'cover' }).png().toFile(outApple);

const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(
  icoSizes.map((size) => sharp(source).resize(size, size, { fit: 'cover' }).png().toBuffer())
);
fs.writeFileSync(outIco, await toIco(icoBuffers));

console.log('Generated favicon.png, apple-touch-icon.png, favicon.ico');
