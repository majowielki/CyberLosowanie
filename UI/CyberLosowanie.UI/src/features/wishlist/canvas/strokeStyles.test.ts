import { describe, expect, it } from 'vitest';
import {
  MAX_SPARKLES_PER_STROKE,
  createRandom,
  darken,
  hashString,
  hexToHsv,
  hsvToHex,
  isLightColor,
  jitterOffset,
  lighten,
  sampleSparkles,
} from './strokeStyles';

describe('colour helpers', () => {
  it('lightens and darkens towards white and black', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(lighten('#e11d48', 0)).toBe('#e11d48');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(darken('#e11d48', 0)).toBe('#e11d48');
  });

  it('treats malformed colours as black instead of throwing', () => {
    expect(lighten('red', 0.5)).toBe('#808080');
  });

  it('converts between hex and HSV', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
    // Hue-less colours fall back to red's hue.
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
    expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
    expect(hsvToHex({ h: 60, s: 1, v: 1 })).toBe('#ffff00');
    expect(hsvToHex({ h: 300, s: 0.5, v: 0.5 })).toBe('#804080');
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe('#ffffff');
  });

  it('flags only colours too light to read on white', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#f6f0e4')).toBe(true);
    // The rest of the pen palette stays readable on the white toolbar.
    for (const hex of ['#111827', '#e11d48', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1']) {
      expect(isLightColor(hex)).toBe(false);
    }
  });

  it('round-trips palette colours through HSV', () => {
    for (const hex of ['#111827', '#e11d48', '#22c55e', '#0ea5e9', '#92400e']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});

describe('deterministic randomness', () => {
  it('yields the same sequence for the same seed', () => {
    const a = createRandom(hashString('stroke-1'));
    const b = createRandom(hashString('stroke-1'));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('yields different sequences for different seeds', () => {
    const a = createRandom(hashString('stroke-1'));
    const b = createRandom(hashString('stroke-2'));
    expect(a()).not.toBe(b());
  });

  it('keeps the crayon jitter within the requested magnitude', () => {
    const { dx, dy } = jitterOffset('abc', 1, 3);
    expect(Math.abs(dx)).toBeLessThanOrEqual(3);
    expect(Math.abs(dy)).toBeLessThanOrEqual(3);
  });
});

describe('sampleSparkles', () => {
  const line = (length: number) => [0, 0, length, 0];

  // The author and their Santa must see identical glitter — sparkles are a
  // pure function of the stroke's own data.
  it('is deterministic for the same stroke', () => {
    expect(sampleSparkles(line(300), 12, 'id-1')).toEqual(sampleSparkles(line(300), 12, 'id-1'));
    expect(sampleSparkles(line(300), 12, 'id-1')).not.toEqual(sampleSparkles(line(300), 12, 'id-2'));
  });

  it('scatters sparkles along the path and across its thickness', () => {
    const sparkles = sampleSparkles(line(300), 12, 'id');
    expect(sparkles.length).toBeGreaterThan(10);
    for (const sparkle of sparkles) {
      expect(sparkle.x).toBeGreaterThanOrEqual(-12);
      expect(sparkle.x).toBeLessThanOrEqual(312);
      expect(Math.abs(sparkle.y)).toBeLessThanOrEqual(12 * 0.55);
      expect(sparkle.radius).toBeGreaterThan(0);
    }
  });

  it('caps the number of sparkles on very long strokes', () => {
    expect(sampleSparkles(line(100_000), 3, 'id').length).toBeLessThanOrEqual(MAX_SPARKLES_PER_STROKE + 1);
  });

  it('still sparkles on a single tap', () => {
    expect(sampleSparkles([5, 5], 8, 'id').length).toBeGreaterThan(0);
  });

  it('returns nothing for an empty stroke', () => {
    expect(sampleSparkles([], 8, 'id')).toEqual([]);
  });
});
