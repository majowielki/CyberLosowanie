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
  // Also the budget for all rings of one area fill together.
  maxPointsPerStroke: 20_000,
  maxFillRings: 256,
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

export const STROKE_WIDTHS = [3, 6, 12, 24, 40, 64] as const;

// Pen styles (stroke `kind`, pen tool only). Mirrors API WishlistConstants
// STROKE_KIND_*; a stroke without a kind is a plain pen (documents saved
// before styles existed). Rendering per kind lives in strokeStyles.ts.
export const STROKE_KINDS = [
  'pen',
  'marker',
  'highlighter',
  'crayon',
  'glossy',
  'neon',
  'glitter',
] as const;
export const DEFAULT_STROKE_KIND: (typeof STROKE_KINDS)[number] = 'pen';

export const DEFAULT_PEN_COLOR: string = PEN_COLORS[0];
export const DEFAULT_STROKE_WIDTH: number = STROKE_WIDTHS[1];

// Default font of a text without `fontFamily` (texts saved before fonts existed).
export const TEXT_FONT_FAMILY = 'Arial';
// Selectable text fonts (text item `fontFamily`). Mirrors API WishlistConstants
// FONT_FAMILIES; ids live in saved wishlists, so they are only ever added. All
// ship latin-ext, i.e. the Polish letters (fonts without them render broken text).
export const TEXT_FONTS = [
  { id: 'caveat', family: 'Caveat' },
  { id: 'patrick-hand', family: 'Patrick Hand' },
  { id: 'berkshire-swash', family: 'Berkshire Swash' },
  { id: 'lobster', family: 'Lobster' },
  { id: 'great-vibes', family: 'Great Vibes' },
  { id: 'kaushan-script', family: 'Kaushan Script' },
  { id: 'rubik-wet-paint', family: 'Rubik Wet Paint' },
] as const;
// New texts start in a handwriting font — it is a wishlist, not a form.
export const DEFAULT_TEXT_FONT: (typeof TEXT_FONTS)[number]['id'] = 'caveat';
export const DEFAULT_FONT_SIZE = 36;
// Emojis are inserted as text items at a larger, sticker-like size.
export const EMOJI_INSERT_FONT_SIZE = 120;
export const DEFAULT_TEXT_WIDTH = 420;
export const DEFAULT_TEXT_PLACEHOLDER = 'Wpisz tekst...';
export const MIN_TEXT_WIDTH = 40;

// Mobile text sheet: font size presets (document units) and the layout of a
// text added by tap — a list line spanning the rest of the page width.
export const TEXT_SIZE_PRESETS = [
  { id: 'small', fontSize: 32 },
  { id: 'medium', fontSize: 48 },
  { id: 'large', fontSize: 72 },
  { id: 'huge', fontSize: 110 },
] as const;
export const MOBILE_DEFAULT_FONT_SIZE = 48;
export const MOBILE_TEXT_MARGIN = 48;
export const MOBILE_MIN_TEXT_WIDTH = 320;

// Editor tools and the key that picks each one (single letter, no modifier).
export const TOOL_SHORTCUTS = {
  select: 'V',
  pen: 'P',
  eraser: 'E',
  text: 'T',
  shape: 'S',
  fill: 'F',
} as const;

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
// PNG/WebP sources (which may be transparent — e.g. lettering exported from
// Canva) are re-encoded as WebP, which keeps the alpha channel.
export const IMAGE_DOWNSCALE_WEBP_QUALITY = 0.9;
export const IMAGE_INSERT_MAX_WIDTH_RATIO = 0.6;

// Page background patterns (page `pattern`, fill tool). Mirrors API
// WishlistConstants PAGE_PATTERNS; a page without one is plain. The pattern's
// ink colour is derived from the background (pagePatterns.ts), so a page
// stores only the pattern name.
export const PAGE_PATTERNS = [
  'dots',
  'grid',
  'lines',
  'stripes',
  'checker',
  'snowflakes',
  'stars',
  'satin',
  'glossy',
  'paper',
] as const;

// Area fill (fill tool on a drawn region). Gaps in a hand-drawn outline up to
// about twice the radius (document units) are closed before the colour floods;
// the level is an editor setting, not stored in the document.
export const FILL_GAP_LEVELS = ['none', 'small', 'large'] as const;
export type FillGapLevel = (typeof FILL_GAP_LEVELS)[number];
export const FILL_GAP_RADIUS: Record<FillGapLevel, number> = { none: 0, small: 3, large: 7 };
export const DEFAULT_FILL_GAP: FillGapLevel = 'small';
// A click on empty paper whose region touches the page edge and covers at
// least this share of the page recolours the page background (keeping its
// pattern) instead of adding an area fill.
export const OPEN_BACKGROUND_SHARE = 0.4;

// Shape items (shape tool). Mirrors API WishlistConstants SHAPE_KINDS. A shape
// is drawn by dragging its bounding box; a plain click inserts one at
// DEFAULT_SHAPE_SIZE centred on the click.
export const SHAPE_KINDS = ['rect', 'ellipse', 'triangle', 'diamond', 'star', 'heart', 'arrow'] as const;
export const DEFAULT_SHAPE_SIZE = 220;
// Drags shorter than this (document units) count as a click.
export const SHAPE_DRAG_THRESHOLD = 6;

// Built-in sticker library (sticker item `stickerId`). Mirrors API
// WishlistConstants STICKER_IDS; the artwork and default size of each id live
// in stickers.ts. Ids are stored in saved wishlists, so they are never renamed
// or removed — see src/assets/stickers/README.md.
export const STICKER_IDS = ['drogi-mikolaju', 'choinka', 'prezent'] as const;
