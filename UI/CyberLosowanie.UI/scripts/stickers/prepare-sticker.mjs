#!/usr/bin/env node
// Turns a generated sticker image into a bundled wishlist sticker:
//   1. transparency – keeps a real alpha channel, or removes a flat magenta (#FF00FF) background
//      (flood fill from the edges, so colours inside the white die-cut border are never touched),
//   2. trims empty edges, adds a small even margin,
//   3. scales the longer edge to 1024 px and writes WebP with alpha to src/assets/stickers/<id>.webp,
//      plus a 160 px picker thumbnail to src/assets/stickers/thumbs/<id>.webp,
//   4. prints the size to paste into stickers.ts (longer edge = --size document units, aspect kept).
//
// Usage (from UI/CyberLosowanie.UI):
//   node scripts/stickers/prepare-sticker.mjs <input.png> <sticker-id> [--size 300]
// Needs the dev dependency: npm i -D sharp
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const [input, id, ...rest] = process.argv.slice(2);
if (!input || !id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: prepare-sticker.mjs <input> <kebab-case-id> [--size 300] [--out dir]');
  process.exit(1);
}
const option = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : fallback;
};
const docSize = Number(option('size', '300'));
const keyHex = option('key', 'ff00ff');
const outDir = option('out', 'src/assets/stickers');
const MAX_EDGE = 1024;
const THUMB_EDGE = 160; // the picker shows thumbnails ~64-80 CSS px tall; 160 px stays sharp at 2x
const MARGIN = 12; // px of transparent margin after trimming

if (keyHex.toLowerCase() !== 'ff00ff') {
  console.error('Only the magenta key (#FF00FF) is supported – it never appears in the sticker palette.');
  process.exit(1);
}
// "Magenta-ness" of a pixel: 255 on the key, ~0 on white, greys and the warm sticker palette.
const spill = (i) => Math.max(0, Math.min(data[i], data[i + 2]) - data[i + 1]);
const REACH = 12; // background spreads only through pixels at least this magenta

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const px = (x, y) => (y * width + x) * 4;

// Real transparency = the corners are already (mostly) transparent.
const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
const hasRealAlpha = corners.every((i) => data[i + 3] < 16);

// Models rarely paint an exact #FF00FF: the backdrop is a noisy near-magenta. Measure it on the
// image border (median magenta-ness, average colour) and key against that instead of the ideal.
const border = [];
for (let x = 0; x < width; x += 4) border.push(px(x, 0), px(x, height - 1));
for (let y = 0; y < height; y += 4) border.push(px(0, y), px(width - 1, y));
const borderSpill = border.map(spill).sort((a, b) => a - b)[border.length >> 1];
const key = [0, 1, 2].map((c) => border.reduce((sum, i) => sum + data[i + c], 0) / border.length);
const SEED = borderSpill * 0.75; // clearly background – also seeds enclosed holes (e.g. a photo-frame window)
const SOLID = borderSpill * 0.85; // at least this magenta = fully transparent

if (!hasRealAlpha) {
  if (!corners.every((i) => spill(i) > 120)) {
    console.error(
      'No transparency and the corners are not flat magenta (#FF00FF).' +
        ' Regenerate with a transparent background or on a flat magenta background.'
    );
    process.exit(2);
  }
  // Flood fill from the image border and from pure-magenta pixels, through magenta-tinted pixels only.
  // The white die-cut border stops the fill, so red/pink parts inside the sticker are never touched.
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (!visited[p] && spill(p * 4) >= REACH) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  for (let p = 0; p < width * height; p++) if (spill(p * 4) > SEED) push(p);
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p >= width) push(p - width);
    if (p < width * (height - 1)) push(p + width);
  }
  for (let p = 0; p < width * height; p++) {
    if (!visited[p]) continue;
    const i = p * 4;
    // A pixel blended from key and sticker edge: its magenta-ness is the key's share.
    const alpha = 1 - Math.min(1, spill(i) / SOLID);
    for (let c = 0; c < 3; c++) {
      data[i + c] = alpha > 0.02 ? Math.min(255, Math.max(0, (data[i + c] - (1 - alpha) * key[c]) / alpha)) : 0;
    }
    data[i + 3] = Math.round(alpha * data[i + 3]);
  }
}

// Drop faint specks of semi-transparent noise left around the silhouette.
for (let i = 3; i < data.length; i += 4) if (data[i] < 10) data[i] = 0;

const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .toBuffer({ resolveWithObject: true });

const scale = Math.min(1, (MAX_EDGE - 2 * MARGIN) / Math.max(trimmed.info.width, trimmed.info.height));
const w = Math.round(trimmed.info.width * scale);
const h = Math.round(trimmed.info.height * scale);

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `${id}.webp`);
await sharp(trimmed.data, { raw: { width: trimmed.info.width, height: trimmed.info.height, channels: trimmed.info.channels } })
  .resize(w, h)
  .extend({ top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .webp({ quality: 90, alphaQuality: 100, effort: 6 })
  .toFile(outFile);

// The picker loads a whole category at once, so it gets a small thumbnail instead of the full file.
await mkdir(path.join(outDir, 'thumbs'), { recursive: true });
const thumbFile = path.join(outDir, 'thumbs', `${id}.webp`);
await sharp(outFile)
  .resize(THUMB_EDGE, THUMB_EDGE, { fit: 'inside' })
  .webp({ quality: 80, alphaQuality: 90, effort: 6 })
  .toFile(thumbFile);
const { size: thumbSize } = await stat(thumbFile);

const finalW = w + 2 * MARGIN;
const finalH = h + 2 * MARGIN;
const ratio = finalW / finalH;
const docW = Math.round(ratio >= 1 ? docSize : docSize * ratio);
const docH = Math.round(ratio >= 1 ? docSize / ratio : docSize);
const { size } = await stat(outFile);

console.log(
  `${outFile}  ${finalW}x${finalH}px  ${(size / 1024).toFixed(0)} KB  ` +
    `(${hasRealAlpha ? 'native alpha' : `keyed #${keyHex}`}), thumbnail ${(thumbSize / 1024).toFixed(1)} KB`
);
console.log(`stickers.ts size: width: ${docW}, height: ${docH}`);
if (size > 150 * 1024) console.warn('Warning: over 150 KB – consider a simpler design or --size check.');
