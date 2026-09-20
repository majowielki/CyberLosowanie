// Pure helpers behind the pen styles (stroke `kind`): colour mixing for
// highlights/shadows and deterministic "randomness" for textures. Everything
// derived here is a function of the stroke's own data (id, points, width), so
// the author and their Santa render pixel-identical pages without storing
// any extra geometry in the document.

/** #rrggbb → [r, g, b] (0–255). Falls back to black for malformed input. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return [0, 0, 0];
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const toByte = (channel: number) =>
    Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Blends `hex` towards white (`amount` 0 = unchanged, 1 = white). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}

/** Blends `hex` towards black (`amount` 0 = unchanged, 1 = black). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * (1 - amount), g * (1 - amount), b * (1 - amount)]);
}

/** FNV-1a 32-bit hash — turns a stroke id into a PRNG seed. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — tiny seeded PRNG returning floats in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Sparkle {
  x: number;
  y: number;
  radius: number;
  /** Dots are plain circles; stars are four-pointed. */
  shape: 'dot' | 'star';
  rotation: number;
  opacity: number;
}

/** Upper bound on sparkles per stroke — keeps long scribbles cheap to draw. */
export const MAX_SPARKLES_PER_STROKE = 320;

/**
 * Places glitter sparkles along a polyline: roughly one per stroke-width of
 * path length, scattered across the stroke's thickness. Deterministic for a
 * given (seed, points, width).
 */
export function sampleSparkles(
  points: number[],
  width: number,
  seed: string,
  maxCount = MAX_SPARKLES_PER_STROKE,
): Sparkle[] {
  if (points.length < 2) {
    return [];
  }
  const random = createRandom(hashString(seed));
  const sparkles: Sparkle[] = [];

  // A single tap still gets a couple of sparkles so the tool feels responsive.
  if (points.length < 4) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      sparkles.push(makeSparkle(points[0], points[1], width, random));
    }
    return sparkles;
  }

  let totalLength = 0;
  for (let i = 2; i < points.length; i += 2) {
    totalLength += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  }
  const spacing = Math.max(Math.max(6, width * 0.9), totalLength / maxCount);

  let carry = spacing * random();
  for (let i = 2; i < points.length; i += 2) {
    const x0 = points[i - 2];
    const y0 = points[i - 1];
    const dx = points[i] - x0;
    const dy = points[i + 1] - y0;
    const segment = Math.hypot(dx, dy);
    if (segment === 0) {
      continue;
    }
    while (carry <= segment) {
      const t = carry / segment;
      sparkles.push(makeSparkle(x0 + dx * t, y0 + dy * t, width, random));
      carry += spacing;
    }
    carry -= segment;
  }
  return sparkles;
}

function makeSparkle(x: number, y: number, width: number, random: () => number): Sparkle {
  // Scatter across the stroke's thickness (a touch beyond the edge reads as glitter).
  const angle = random() * Math.PI * 2;
  const distance = random() * width * 0.55;
  const star = random() < 0.18;
  const base = width * (0.06 + random() * 0.12);
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
    radius: star ? base * 2.4 : base,
    shape: star ? 'star' : 'dot',
    rotation: random() * 90,
    opacity: 0.55 + random() * 0.45,
  };
}

/** Small deterministic (dx, dy) offset for the crayon's extra passes. */
export function jitterOffset(seed: string, pass: number, magnitude: number): { dx: number; dy: number } {
  const random = createRandom(hashString(`${seed}:${pass}`));
  return {
    dx: (random() * 2 - 1) * magnitude,
    dy: (random() * 2 - 1) * magnitude,
  };
}
