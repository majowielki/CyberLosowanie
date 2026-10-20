// Area fill ("paint bucket") for hand-drawn regions. Pure raster → vector:
// the editor rasterizes the drawing layer at document resolution, this module
// floods the clicked region and traces it back into polygons (outer rings and
// holes, rendered with the even-odd rule). Storing polygons instead of pixels
// keeps the document small and makes the fill look identical for the author
// and their Santa at any zoom.

/** RGBA pixels, row-major, non-premultiplied — the shape of ImageData. */
export interface RasterImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface AreaFillOptions {
  /** Outline breaks up to about twice this radius (px) are closed before flooding. */
  gapRadius: number;
  /** Max summed RGBA difference from the clicked colour that still floods. */
  tolerance?: number;
  /** Max numbers (x,y pairs × 2) across all rings — the polygon is coarsened to fit. */
  maxPoints: number;
  /** Max rings (outer + holes); the smallest holes are dropped beyond it. */
  maxRings: number;
}

export interface AreaFillResult {
  /** Closed polygons as flat x,y lists in pixel-corner coordinates. */
  rings: number[][];
  /** Flooded pixel count. */
  area: number;
  touchesBorder: boolean;
  /** The click landed on empty paper (nothing drawn under it). */
  seedEmpty: boolean;
}

// Below this alpha a pixel counts as empty paper — it also lets the flood
// reach halfway into a line's anti-aliased edge.
const EMPTY_ALPHA = 128;
// The final 1 px grow covers the anti-aliased fringe but never a line's core.
const CORE_ALPHA = 230;
const DEFAULT_TOLERANCE = 96;
// Specks smaller than this (px²) are dropped: tiny holes get filled, tiny
// islands left out — both are anti-aliasing noise, not intent.
const MIN_RING_AREA = 12;
const SIMPLIFY_EPSILON = 0.75;
const MAX_SIMPLIFY_ROUNDS = 8;

/**
 * Floods the region under `seed` (pixel coordinates) and returns it as rings,
 * or null when there is nothing to fill (seed off the image) or the region is
 * too intricate to fit the point budget even after coarsening.
 */
export function computeAreaFill(
  image: RasterImage,
  seed: { x: number; y: number },
  options: AreaFillOptions,
): AreaFillResult | null {
  const { width, height, data } = image;
  const seedX = Math.floor(seed.x);
  const seedY = Math.floor(seed.y);
  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) {
    return null;
  }

  const passable = buildPassableMask(image, seedY * width + seedX, options.tolerance ?? DEFAULT_TOLERANCE);
  const seedIndex = seedY * width + seedX;
  const seedEmpty = data[seedIndex * 4 + 3] < EMPTY_ALPHA;

  let region = floodWithGapClosing(passable, width, height, seedIndex, Math.round(options.gapRadius));

  // Grow 1 px over semi-transparent neighbours — a line's anti-aliased fringe —
  // so no light seam shows along it. Never onto empty paper or a line's core.
  const grown = dilate(region, width, height, 1);
  for (let i = 0; i < grown.length; i++) {
    const alpha = data[i * 4 + 3];
    if (grown[i] && !region[i] && (alpha < EMPTY_ALPHA || alpha >= CORE_ALPHA)) {
      grown[i] = 0;
    }
  }
  region = grown;

  let area = 0;
  let touchesBorder = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (region[y * width + x]) {
        area++;
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          touchesBorder = true;
        }
      }
    }
  }
  if (area === 0) {
    return null;
  }

  const rings = fitRings(traceRings(region, width, height), options);
  return rings ? { rings, area, touchesBorder, seedEmpty } : null;
}

/** 1 where a pixel looks like the clicked one (empty paper, or a similar colour). */
function buildPassableMask(image: RasterImage, seedIndex: number, tolerance: number): Uint8Array {
  const { data } = image;
  const count = image.width * image.height;
  const mask = new Uint8Array(count);
  const o = seedIndex * 4;
  const seedEmpty = data[o + 3] < EMPTY_ALPHA;
  const [r, g, b, a] = [data[o], data[o + 1], data[o + 2], data[o + 3]];

  for (let i = 0, p = 0; i < count; i++, p += 4) {
    if (seedEmpty) {
      mask[i] = data[p + 3] < EMPTY_ALPHA ? 1 : 0;
    } else {
      const difference =
        Math.abs(data[p] - r) + Math.abs(data[p + 1] - g) + Math.abs(data[p + 2] - b) + Math.abs(data[p + 3] - a);
      mask[i] = difference <= tolerance ? 1 : 0;
    }
  }
  return mask;
}

/**
 * Morphological closing around the flood: thicken the walls by `radius` (so
 * small breaks seal), flood, then grow the result back by `radius` within the
 * original passable area. If the click lands somewhere the thickened walls
 * swallow (a sliver narrower than the gap), it falls back to a plain flood.
 */
function floodWithGapClosing(
  passable: Uint8Array,
  width: number,
  height: number,
  seedIndex: number,
  radius: number,
): Uint8Array {
  if (radius <= 0) {
    return flood(passable, width, height, seedIndex);
  }

  const walls = new Uint8Array(passable.length);
  for (let i = 0; i < passable.length; i++) {
    walls[i] = passable[i] ? 0 : 1;
  }
  const thickWalls = dilate(walls, width, height, radius);
  // The page edge is a wall too, so an outline drawn almost up to it seals.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < radius || y < radius || x >= width - radius || y >= height - radius) {
        thickWalls[y * width + x] = 1;
      }
    }
  }
  if (thickWalls[seedIndex]) {
    return flood(passable, width, height, seedIndex);
  }

  const narrowed = new Uint8Array(passable.length);
  for (let i = 0; i < passable.length; i++) {
    narrowed[i] = thickWalls[i] ? 0 : 1;
  }
  const core = flood(narrowed, width, height, seedIndex);
  const restored = dilate(core, width, height, radius);
  for (let i = 0; i < restored.length; i++) {
    restored[i] &= passable[i];
  }
  return restored;
}

/** 4-connected scanline flood of `open` from `seedIndex`; returns the region mask. */
export function flood(open: Uint8Array, width: number, height: number, seedIndex: number): Uint8Array {
  const region = new Uint8Array(open.length);
  if (!open[seedIndex]) {
    return region;
  }
  const visited = new Uint8Array(open.length);
  const stack: number[] = [seedIndex];

  while (stack.length > 0) {
    const index = stack.pop() as number;
    if (visited[index] || !open[index]) {
      continue;
    }
    const y = Math.floor(index / width);
    const rowStart = y * width;
    let left = index;
    while (left > rowStart && open[left - 1] && !visited[left - 1]) {
      left--;
    }
    let right = index;
    while (right < rowStart + width - 1 && open[right + 1] && !visited[right + 1]) {
      right++;
    }
    for (let i = left; i <= right; i++) {
      visited[i] = 1;
      region[i] = 1;
    }
    // Queue one seed per run of open pixels in the rows above and below.
    for (const neighbourRow of [y - 1, y + 1]) {
      if (neighbourRow < 0 || neighbourRow >= height) {
        continue;
      }
      const offset = (neighbourRow - y) * width;
      let inRun = false;
      for (let i = left; i <= right; i++) {
        const candidate = i + offset;
        const isOpen = open[candidate] === 1 && visited[candidate] === 0;
        if (isOpen && !inRun) {
          stack.push(candidate);
        }
        inRun = isOpen;
      }
    }
  }
  return region;
}

/** Square dilation by `radius` (separable sliding window, O(pixels)). */
export function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) {
    return mask.slice();
  }
  const horizontal = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let count = 0;
    // Window [x - radius, x + radius], primed with its right half.
    for (let x = 0; x < Math.min(radius, width); x++) {
      count += mask[row + x];
    }
    for (let x = 0; x < width; x++) {
      const enter = x + radius;
      const leave = x - radius - 1;
      if (enter < width) count += mask[row + enter];
      if (leave >= 0) count -= mask[row + leave];
      horizontal[row + x] = count > 0 ? 1 : 0;
    }
  }

  const result = new Uint8Array(mask.length);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < Math.min(radius, height); y++) {
      count += horizontal[y * width + x];
    }
    for (let y = 0; y < height; y++) {
      const enter = y + radius;
      const leave = y - radius - 1;
      if (enter < height) count += horizontal[enter * width + x];
      if (leave >= 0) count -= horizontal[leave * width + x];
      result[y * width + x] = count > 0 ? 1 : 0;
    }
  }
  return result;
}

// Edge directions on the pixel-corner grid (y grows down): east, south, west, north.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/**
 * Traces the region's boundary into closed rings on the pixel-corner grid.
 * Every region pixel side facing outside becomes a directed edge, clockwise
 * around the pixel (region on the right); edges are then chained into loops.
 * Where two region pixels touch only at a corner, the walk turns right, which
 * keeps them apart — matching the 4-connected flood. Only corners where the
 * direction changes are kept.
 */
export function traceRings(region: Uint8Array, width: number, height: number): number[][] {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && region[y * width + x] === 1;
  const stride = width + 1;

  const edgeStart: number[] = [];
  const edgeDir: number[] = [];
  // Up to two outgoing edges per corner vertex (two only at diagonal touches).
  const firstOut = new Map<number, number>();
  const secondOut = new Map<number, number>();
  const addEdge = (x: number, y: number, dir: number) => {
    const vertex = y * stride + x;
    const edge = edgeStart.length;
    edgeStart.push(vertex);
    edgeDir.push(dir);
    if (firstOut.has(vertex)) {
      secondOut.set(vertex, edge);
    } else {
      firstOut.set(vertex, edge);
    }
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!at(x, y)) {
        continue;
      }
      if (!at(x, y - 1)) addEdge(x, y, 0); // top: east
      if (!at(x + 1, y)) addEdge(x + 1, y, 1); // right: south
      if (!at(x, y + 1)) addEdge(x + 1, y + 1, 2); // bottom: west
      if (!at(x - 1, y)) addEdge(x, y + 1, 3); // left: north
    }
  }

  const used = new Uint8Array(edgeStart.length);
  const rings: number[][] = [];

  for (let start = 0; start < edgeStart.length; start++) {
    if (used[start]) {
      continue;
    }
    const ring: number[] = [];
    let edge = start;
    let previousDir = -1;
    while (!used[edge]) {
      used[edge] = 1;
      const dir = edgeDir[edge];
      const vertex = edgeStart[edge];
      if (dir !== previousDir) {
        ring.push(vertex % stride, Math.floor(vertex / stride));
      }
      previousDir = dir;
      const end = vertex + DY[dir] * stride + DX[dir];
      const a = firstOut.get(end);
      const b = secondOut.get(end);
      if (b === undefined || used[b]) {
        edge = a as number;
      } else if (used[a as number]) {
        edge = b;
      } else {
        // Two ways on: take the right turn (dir + 1 clockwise).
        edge = edgeDir[a as number] === (dir + 1) % 4 ? (a as number) : b;
      }
    }
    // The loop may close on a straight run: drop a start corner that is not a turn.
    if (ring.length >= 6 && edgeDir[start] === previousDir) {
      ring.splice(0, 2);
    }
    if (ring.length >= 6) {
      rings.push(ring);
    }
  }
  return rings;
}

/** Shoelace area of a flat ring (absolute value). */
export function ringArea(ring: number[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 2) {
    const j = (i + 2) % ring.length;
    sum += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
  }
  return Math.abs(sum) / 2;
}

/** Drops specks, caps the ring count and simplifies until the point budget fits. */
function fitRings(rings: number[][], options: AreaFillOptions): number[][] | null {
  let kept = rings
    .map((ring) => ({ ring, area: ringArea(ring) }))
    .filter(({ area }) => area >= MIN_RING_AREA)
    .sort((first, second) => second.area - first.area)
    .slice(0, options.maxRings)
    .map(({ ring }) => ring);
  if (kept.length === 0) {
    return null;
  }

  let epsilon = SIMPLIFY_EPSILON;
  for (let round = 0; round < MAX_SIMPLIFY_ROUNDS; round++) {
    const simplified = kept.map((ring) => simplifyRing(ring, epsilon)).filter((ring) => ring.length >= 6);
    const total = simplified.reduce((sum, ring) => sum + ring.length, 0);
    if (total <= options.maxPoints) {
      return simplified;
    }
    epsilon *= 1.8;
    kept = simplified;
  }
  return null;
}

/** Ramer–Douglas–Peucker on a closed ring, split at the vertex farthest from the first. */
export function simplifyRing(ring: number[], epsilon: number): number[] {
  const count = ring.length / 2;
  if (count <= 4) {
    return ring;
  }
  let farthest = 0;
  let farthestDistance = -1;
  for (let i = 1; i < count; i++) {
    const distance = (ring[i * 2] - ring[0]) ** 2 + (ring[i * 2 + 1] - ring[1]) ** 2;
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthest = i;
    }
  }
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= count; i++) {
    const index = (i % count) * 2;
    points.push([ring[index], ring[index + 1]]);
  }
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[farthest] = 1;
  keep[points.length - 1] = 1;
  markRdp(points, 0, farthest, epsilon, keep);
  markRdp(points, farthest, points.length - 1, epsilon, keep);

  const result: number[] = [];
  // The last point repeats the first — skip it.
  for (let i = 0; i < points.length - 1; i++) {
    if (keep[i]) {
      result.push(points[i][0], points[i][1]);
    }
  }
  return result;
}

function markRdp(
  points: Array<[number, number]>,
  first: number,
  last: number,
  epsilon: number,
  keep: Uint8Array,
): void {
  // Iterative to stay safe on very long outlines.
  const stack: Array<[number, number]> = [[first, last]];
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    let maxDistance = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i];
      const distance = length === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / length;
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (index >= 0 && maxDistance > epsilon) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }
}
