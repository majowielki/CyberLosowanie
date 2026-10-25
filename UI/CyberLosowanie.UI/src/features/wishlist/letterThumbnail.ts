/** Marks the element whose first wishlist page becomes the letter in the flight animation. */
export const LETTER_SOURCE_ATTR = 'data-letter-source';

const THUMB_WIDTH = 480;

/**
 * A small JPEG of the first wishlist page as shown on screen: the Konva layers
 * (one canvas each) drawn on top of each other. Returns null when there is no
 * canvas or it cannot be read (the animation then shows a plain paper).
 */
export function captureLetterThumbnail(): string | null {
  try {
    const host = document.querySelector(`[${LETTER_SOURCE_ATTR}] .konvajs-content`);
    const layers = host ? Array.from(host.querySelectorAll('canvas')) : [];
    const first = layers[0];
    if (!first || first.width === 0 || first.height === 0) {
      return null;
    }
    const scale = Math.min(1, THUMB_WIDTH / first.width);
    const out = document.createElement('canvas');
    out.width = Math.round(first.width * scale);
    out.height = Math.round(first.height * scale);
    const context = out.getContext('2d');
    if (!context) {
      return null;
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, out.width, out.height);
    layers.forEach((layer) => context.drawImage(layer, 0, 0, out.width, out.height));
    return out.toDataURL('image/jpeg', 0.85);
  } catch {
    // jsdom (no canvas) or a tainted canvas.
    return null;
  }
}
