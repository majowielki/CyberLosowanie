import { describe, expect, it } from 'vitest';
import { luminance, patternInkColor, scatterPoints } from './pagePatterns';

describe('patternInkColor', () => {
  it('goes darker on light pages and lighter on dark pages', () => {
    expect(luminance(patternInkColor('#ffffff'))).toBeLessThan(luminance('#ffffff'));
    expect(luminance(patternInkColor('#0b2118'))).toBeGreaterThan(luminance('#0b2118'));
  });

  it('is deterministic', () => {
    expect(patternInkColor('#e11d48')).toBe(patternInkColor('#e11d48'));
  });
});

describe('scatterPoints', () => {
  // The author and their Santa must see the same snowflakes/stars/grain.
  it('is deterministic per seed and differs between seeds', () => {
    expect(scatterPoints('page-1', 20, 100, 200)).toEqual(scatterPoints('page-1', 20, 100, 200));
    expect(scatterPoints('page-1', 20, 100, 200)).not.toEqual(scatterPoints('page-2', 20, 100, 200));
  });

  it('keeps every point inside the area', () => {
    for (const point of scatterPoints('seed', 500, 1080, 1528)) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThan(1080);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThan(1528);
      expect(point.size).toBeGreaterThan(0);
      expect(point.opacity).toBeGreaterThan(0);
    }
  });
});
