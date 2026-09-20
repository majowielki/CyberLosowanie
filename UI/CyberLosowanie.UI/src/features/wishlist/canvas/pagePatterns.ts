// Pure helpers behind the page background patterns. A page stores only the
// pattern name; the ink colour and every scattered position are derived from
// the page's own data (background colour, page id), so the author and their
// Santa render the same page.

import { createRandom, darken, hashString, hexToRgb, lighten } from './strokeStyles';

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Ink colour for a pattern on a given background: a shade darker on light
 * pages, lighter on dark ones — always visible, never loud.
 */
export function patternInkColor(background: string): string {
  return luminance(background) > 0.4 ? darken(background, 0.16) : lighten(background, 0.22);
}

export interface ScatterPoint {
  x: number;
  y: number;
  /** 0–1, scales the shape. */
  size: number;
  rotation: number;
  opacity: number;
}

/**
 * Deterministic scatter of `count` points across a width×height area, seeded
 * by the page id (snowflakes, stars, paper grain).
 */
export function scatterPoints(
  seed: string,
  count: number,
  width: number,
  height: number,
): ScatterPoint[] {
  const random = createRandom(hashString(seed));
  return Array.from({ length: count }, () => ({
    x: random() * width,
    y: random() * height,
    size: 0.35 + random() * 0.65,
    rotation: random() * 360,
    opacity: 0.5 + random() * 0.5,
  }));
}
