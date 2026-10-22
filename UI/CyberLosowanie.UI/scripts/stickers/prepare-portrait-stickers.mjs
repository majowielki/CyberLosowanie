#!/usr/bin/env node
// Turns the participants' cut-out portraits (caricature and child, background
// already removed — see src/assets/stickers/README.md) into stickers matching the
// library: a thick white die-cut border around the silhouette, a fixed 4:5 frame
// (so every portrait sticker shares one default size) and WebP with alpha.
//
// The output shows real people, so it is never committed: it goes to the
// git-ignored src/assets/naklejki-portrety/ and API/scripts/Upload-CyberkiImages.ps1
// uploads it to Blob Storage.
//
// Usage (from UI/CyberLosowanie.UI):
//   node scripts/stickers/prepare-portrait-stickers.mjs [inputDir] [outputDir]
// inputDir holds <Prefix>_<Name>.png cut-outs (default stickers-work/portraits/raw).
import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const inputDir = process.argv[2] ?? 'stickers-work/portraits/raw';
const outputDir = process.argv[3] ?? 'src/assets/naklejki-portrety';
const OUT_WIDTH = 800;
const OUT_HEIGHT = 1000; // 4:5
const BORDER = 0.035; // die-cut border, share of the silhouette's longer edge
const MARGIN = 0.03; // empty margin around the sticker inside the 4:5 frame

// Exact squared Euclidean distance transform (Felzenszwalb & Huttenlocher), one
// dimension: f holds 0 on the silhouette and a large value elsewhere.
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Alpha mask of the die-cut: everything within `radius` px of the silhouette, anti-aliased. */
function dieCutMask(alpha, width, height, radius) {
  const INF = 1e12;
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = alpha[i] >= 128 ? 0 : INF;
  const size = Math.max(width, height);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y];
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x];
    edt1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x];
  }
  const mask = Buffer.alloc(width * height);
  for (let i = 0; i < mask.length; i++) {
    // One pixel of smooth falloff at the outer edge.
    mask[i] = Math.round(255 * Math.min(1, Math.max(0, radius + 0.5 - Math.sqrt(grid[i]))));
  }
  return mask;
}

async function prepare(file) {
  // Trim to the silhouette first, so the border is measured against the person.
  const silhouette = await sharp(path.join(inputDir, file))
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = silhouette.info;
  const border = Math.round(Math.max(width, height) * BORDER);
  const pad = border * 2;

  const padded = await sharp(silhouette.data)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: paddedWidth, height: paddedHeight } = padded.info;

  // White layer = the silhouette grown by `border` px (a distance transform, so
  // the outline follows the person and corners come out rounded like a cut sticker).
  const alpha = Buffer.alloc(paddedWidth * paddedHeight);
  for (let i = 0; i < alpha.length; i++) alpha[i] = padded.data[i * 4 + 3];
  const mask = dieCutMask(alpha, paddedWidth, paddedHeight, border);
  const whiteRgba = Buffer.alloc(paddedWidth * paddedHeight * 4, 255);
  for (let i = 0; i < mask.length; i++) whiteRgba[i * 4 + 3] = mask[i];
  const white = await sharp(whiteRgba, { raw: { width: paddedWidth, height: paddedHeight, channels: 4 } })
    .png()
    .toBuffer();
  const person = await sharp(padded.data, { raw: { width: paddedWidth, height: paddedHeight, channels: 4 } })
    .png()
    .toBuffer();

  // Two pipelines: sharp trims before it composites, so one chain would trim the
  // white layer first and the person would no longer fit on it.
  const composed = await sharp(white).composite([{ input: person }]).png().toBuffer();
  const sticker = await sharp(composed)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .toBuffer();

  // Centre in the 4:5 frame (aspect kept, transparent margin).
  const inner = { width: Math.round(OUT_WIDTH * (1 - 2 * MARGIN)), height: Math.round(OUT_HEIGHT * (1 - 2 * MARGIN)) };
  const fitted = await sharp(sticker).resize(inner.width, inner.height, { fit: 'inside' }).toBuffer({ resolveWithObject: true });
  const outFile = path.join(outputDir, file.replace(/\.png$/i, '.webp'));
  await sharp({ create: { width: OUT_WIDTH, height: OUT_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted.data, gravity: 'center' }])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(outFile);
  const { size } = await stat(outFile);
  console.log(`${outFile}  ${OUT_WIDTH}x${OUT_HEIGHT}  ${(size / 1024).toFixed(0)} KB`);
}

await mkdir(outputDir, { recursive: true });
const files = (await readdir(inputDir)).filter((f) => /\.png$/i.test(f)).sort();
if (!files.length) {
  console.error(`No .png cut-outs in ${inputDir}`);
  process.exit(1);
}
for (const file of files) {
  await prepare(file);
}
