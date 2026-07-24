// Wishlist canvas constants. Document limits mirror the backend source of truth
// (API Constants/WishlistConstants.cs, section 3.4 of Docs/lista-zyczen-projekt.md)
// so the user gets a warning before the server would answer 400. Keep in sync.

// Version 2 introduced multiple pages (a document is a carousel of pages).
// Version 1 documents are upgraded on read (parseCanvasDocument).
export const CANVAS_DOCUMENT_VERSION = 2;

// Fixed logical workspace (decision D5, portrait ~A4). Every screen renders the
// same document scaled to its container, so the drawing looks identical for the
// author and for their Santa.
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1528;
export const CANVAS_BACKGROUND = '#ffffff';

// Mirror of API Constants/WishlistConstants.cs. Strokes/items are counted per
// page, images across the whole document, and the total JSON size is capped.
export const DOCUMENT_LIMITS = {
  maxJsonBytes: 512 * 1024,
  maxPages: 10,
  maxStrokesPerPage: 4_000,
  maxPointsPerStroke: 20_000,
  maxItemsPerPage: 120,
  maxImageItems: 10,
  maxTextLength: 500,
  minStrokeWidth: 1,
  maxStrokeWidth: 64,
  minFontSize: 8,
  maxFontSize: 200,
} as const;

// Editor palette (Paint-like, decision D2). Colors must satisfy the #rrggbb rule.
export const PEN_COLORS = [
  '#111827', // black
  '#ffffff', // white
  '#e11d48', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#92400e', // brown
] as const;

export const STROKE_WIDTHS = [3, 6, 12, 24] as const;

export const DEFAULT_PEN_COLOR: string = PEN_COLORS[0];
export const DEFAULT_STROKE_WIDTH: number = STROKE_WIDTHS[1];

export const TEXT_FONT_FAMILY = 'Arial';
export const DEFAULT_FONT_SIZE = 36;
// Emojis are inserted as text items at a larger, sticker-like size.
export const EMOJI_INSERT_FONT_SIZE = 120;
export const DEFAULT_TEXT_WIDTH = 420;
export const DEFAULT_TEXT_PLACEHOLDER = 'Wpisz tekst...';
export const MIN_TEXT_WIDTH = 40;

// Viewport (decision D4: full zoom/pan/pinch). User zoom multiplies the
// fit-to-width base scale.
export const MIN_USER_ZOOM = 1;
export const MAX_USER_ZOOM = 4;
export const ZOOM_STEP_FACTOR = 1.5;
export const WHEEL_ZOOM_FACTOR = 1.1;

// Undo history cap — snapshots are cheap (shared references), but unbounded
// growth over a long session is pointless.
export const MAX_UNDO_STEPS = 100;

// Image upload: the client downscales before uploading (the 5 MB limit is a
// safety net, not a target) and inserts the image at a comfortable size.
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const IMAGE_DOWNSCALE_MAX_EDGE = 1600;
export const IMAGE_DOWNSCALE_JPEG_QUALITY = 0.85;
export const IMAGE_INSERT_MAX_WIDTH_RATIO = 0.6;
