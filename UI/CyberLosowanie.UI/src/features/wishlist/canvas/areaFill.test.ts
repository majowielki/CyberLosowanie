import { describe, expect, it } from 'vitest';
import {
  RasterImage,
  computeAreaFill,
  dilate,
  ringArea,
  simplifyRing,
  traceRings,
} from './areaFill';

const OPTIONS = { gapRadius: 0, maxPoints: 20_000, maxRings: 256 };

/** Transparent image with helpers to paint opaque black pixels. */
function createImage(width: number, height: number) {
  const image: RasterImage = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const paint = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    image.data[offset + 3] = 255;
  };
  /** Square outline (1 px wall) from (x0,y0) to (x1,y1) inclusive, minus `gaps`. */
  const outline = (x0: number, y0: number, x1: number, y1: number, gaps: Array<[number, number]> = []) => {
    const isGap = (x: number, y: number) => gaps.some(([gx, gy]) => gx === x && gy === y);
    for (let x = x0; x <= x1; x++) {
      for (const y of [y0, y1]) {
        if (!isGap(x, y)) paint(x, y);
      }
    }
    for (let y = y0; y <= y1; y++) {
      for (const x of [x0, x1]) {
        if (!isGap(x, y)) paint(x, y);
      }
    }
  };
  return { image, paint, outline };
}

describe('computeAreaFill', () => {
  it('fills the inside of a closed outline', () => {
    const { image, outline } = createImage(40, 40);
    outline(10, 10, 29, 29);

    const result = computeAreaFill(image, { x: 20, y: 20 }, OPTIONS);

    expect(result).not.toBeNull();
    expect(result?.seedEmpty).toBe(true);
    expect(result?.touchesBorder).toBe(false);
    expect(result?.area).toBe(18 * 18);
    expect(result?.rings).toEqual([[11, 11, 29, 11, 29, 29, 11, 29]]);
  });

  it('reports the open background as touching the page border', () => {
    const { image, outline } = createImage(40, 40);
    outline(10, 10, 29, 29);

    const result = computeAreaFill(image, { x: 2, y: 2 }, OPTIONS);

    expect(result?.touchesBorder).toBe(true);
    // Outer page ring plus the hole where the square is.
    expect(result?.rings).toHaveLength(2);
  });

  it('leaks through a gap without closing and stays inside with it', () => {
    const { image, outline } = createImage(40, 40);
    // A 2 px break in the top wall.
    outline(10, 10, 29, 29, [[19, 10], [20, 10]]);

    const leaking = computeAreaFill(image, { x: 20, y: 20 }, OPTIONS);
    const sealed = computeAreaFill(image, { x: 20, y: 20 }, { ...OPTIONS, gapRadius: 2 });

    expect(leaking?.touchesBorder).toBe(true);
    expect(sealed?.touchesBorder).toBe(false);
    // Grown back to the walls, plus at most the gap radius into the break.
    expect(sealed?.area).toBeGreaterThanOrEqual(18 * 18);
    expect(sealed?.area).toBeLessThanOrEqual(18 * 18 + 2 * 2);
  });

  it('keeps an island inside the region as a hole', () => {
    const { image, outline } = createImage(60, 60);
    outline(5, 5, 54, 54);
    outline(20, 20, 39, 39);

    const result = computeAreaFill(image, { x: 10, y: 10 }, OPTIONS);

    expect(result?.rings).toHaveLength(2);
    const areas = (result?.rings ?? []).map(ringArea).sort((a, b) => b - a);
    // Inside of the outer wall (48×48) and the island's footprint (20×20).
    expect(areas).toEqual([48 * 48, 20 * 20]);
  });

  it('recolours a drawn line when clicked on it', () => {
    const { image, outline } = createImage(40, 40);
    outline(10, 10, 29, 29);

    const result = computeAreaFill(image, { x: 10, y: 15 }, OPTIONS);

    expect(result?.seedEmpty).toBe(false);
    // The 1 px wall: outer ring minus inner ring.
    expect(result?.area).toBe(20 * 20 - 18 * 18);
  });

  it('covers the anti-aliased fringe but not the line core', () => {
    const { image, outline } = createImage(40, 40);
    outline(10, 10, 29, 29);
    // A soft inner edge on the left wall.
    for (let y = 11; y <= 28; y++) {
      image.data[(y * 40 + 11) * 4 + 3] = 180;
    }

    const result = computeAreaFill(image, { x: 20, y: 20 }, OPTIONS);

    expect(result?.area).toBe(18 * 18);
  });

  it('returns null for a seed outside the image', () => {
    const { image } = createImage(10, 10);
    expect(computeAreaFill(image, { x: -1, y: 3 }, OPTIONS)).toBeNull();
  });
});

describe('traceRings', () => {
  it('traces a single pixel as its four corners', () => {
    const region = new Uint8Array([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(traceRings(region, 3, 3)).toEqual([[1, 1, 2, 1, 2, 2, 1, 2]]);
  });

  it('keeps pixels touching only at a corner apart', () => {
    const region = new Uint8Array([1, 0, 0, 1]);
    expect(traceRings(region, 2, 2)).toHaveLength(2);
  });
});

describe('dilate', () => {
  it('grows a pixel into a square of the given radius', () => {
    const mask = new Uint8Array(25);
    mask[12] = 1;
    const grown = dilate(mask, 5, 5, 1);
    expect(Array.from(grown).reduce((sum, value) => sum + value, 0)).toBe(9);
    expect(grown[0]).toBe(0);
  });
});

describe('simplifyRing', () => {
  it('collapses a staircase into a diagonal', () => {
    const ring: number[] = [];
    for (let i = 0; i < 10; i++) {
      ring.push(i, i, i + 1, i);
    }
    ring.push(10, 10, 0, 10);

    const simplified = simplifyRing(ring, 0.75);

    expect(simplified.length).toBeLessThan(ring.length / 4);
  });
});
