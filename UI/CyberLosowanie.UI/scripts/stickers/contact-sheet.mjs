#!/usr/bin/env node
// Preview of every sticker on the three backgrounds a wishlist page often has (white paper, pine, red),
// so style consistency, halos and leftover background are easy to spot in one image.
// Usage (from UI/CyberLosowanie.UI): node scripts/stickers/contact-sheet.mjs [dir] [out.png]
import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const dir = process.argv[2] ?? 'src/assets/stickers';
const out = process.argv[3] ?? 'stickers-contact-sheet.png';
const files = (await readdir(dir)).filter((f) => /\.(webp|png)$/i.test(f)).sort();
if (!files.length) {
  console.error(`No .webp/.png stickers in ${dir}`);
  process.exit(1);
}

const CELL = 180;
const LABEL = 22;
const COLS = 6;
const BACKGROUNDS = ['#ffffff', '#17442f', '#d8313f'];
const rows = Math.ceil(files.length / COLS);
const blockH = rows * (CELL + LABEL);
const escape = (s) => s.replace(/[<>&]/g, '');

const composites = [];
for (const [b, bg] of BACKGROUNDS.entries()) {
  composites.push({
    input: { create: { width: COLS * CELL, height: blockH, channels: 4, background: bg } },
    left: 0,
    top: b * blockH,
  });
  for (const [i, file] of files.entries()) {
    const x = (i % COLS) * CELL;
    const y = b * blockH + Math.floor(i / COLS) * (CELL + LABEL);
    const thumb = await sharp(path.join(dir, file))
      .resize(CELL - 20, CELL - 20, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    composites.push({ input: thumb, left: x + 10, top: y + 10 });
    const ink = bg === '#ffffff' ? '#333333' : '#ffffff';
    const label = Buffer.from(
      `<svg width="${CELL}" height="${LABEL}"><text x="${CELL / 2}" y="15" font-size="13" font-family="sans-serif" text-anchor="middle" fill="${ink}">${escape(file)}</text></svg>`
    );
    composites.push({ input: label, left: x, top: y + CELL });
  }
}

await sharp({ create: { width: COLS * CELL, height: blockH * BACKGROUNDS.length, channels: 4, background: '#ffffff' } })
  .composite(composites)
  .png()
  .toFile(out);
console.log(`${out}: ${files.length} stickers on ${BACKGROUNDS.length} backgrounds`);
