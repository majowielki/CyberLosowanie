import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STICKER_IDS } from './canvasConstants';
import { PICKER_STICKERS, STICKER_CATEGORIES, STICKERS } from './stickers';

describe('sticker library', () => {
  it.each(STICKER_IDS)('%s has its artwork, thumbnail, size and category', (id) => {
    const sticker = STICKERS[id];

    expect(sticker.src).toEqual(expect.stringContaining(`${id}`));
    expect(sticker.thumbSrc).toEqual(expect.stringContaining(`${id}`));
    expect(sticker.thumbSrc).not.toBe(sticker.src);
    expect(sticker.width).toBeGreaterThan(0);
    expect(sticker.height).toBeGreaterThan(0);
    expect(Math.max(sticker.width, sticker.height)).toBeLessThanOrEqual(600);
    expect(STICKER_CATEGORIES).toContain(sticker.category);
  });

  it('uses kebab-case ASCII ids without duplicates', () => {
    expect(new Set(STICKER_IDS).size).toBe(STICKER_IDS.length);
    for (const id of STICKER_IDS) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('offers every category in the picker', () => {
    for (const category of STICKER_CATEGORIES) {
      expect(PICKER_STICKERS.some((sticker) => sticker.category === category)).toBe(true);
    }
  });

  it('matches the ids the API accepts (WishlistConstants.STICKER_IDS)', () => {
    const constants = readFileSync(
      path.resolve(__dirname, '../../../../../../API/src/CyberLosowanie/Constants/WishlistConstants.cs'),
      'utf8'
    );
    const block = constants.match(/STICKER_IDS\s*=[^{]*\{([^}]*)\}/)?.[1] ?? '';
    const apiIds = [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

    expect(apiIds).toEqual([...STICKER_IDS]);
  });
});
