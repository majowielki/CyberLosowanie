// Types, (de)serialization and validation of the wishlist canvas document —
// the client-side mirror of the backend model (Models/Dto/CanvasDocument.cs)
// and its validator. Validation runs before saving so the user gets a readable
// warning instead of a 400 from the server. Problems are reported as
// translation keys + params (not final strings), so this module stays pure
// and the caller renders them in the current UI language.

import type { TranslationKey, TranslationParams } from '@/shared/i18n';
import {
  CANVAS_BACKGROUND,
  CANVAS_DOCUMENT_VERSION,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOCUMENT_LIMITS,
} from './canvasConstants';

/** A validation problem, translatable at display time. */
export interface CanvasValidationError {
  key: TranslationKey;
  params?: TranslationParams;
}

export type StrokeTool = 'pen' | 'eraser';

export interface CanvasStroke {
  id: string;
  tool: StrokeTool;
  color: string;
  width: number;
  /** Flat list of x,y pairs in document coordinates. */
  points: number[];
}

export interface CanvasTextItem {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fill: string;
  /** Wrap width in document units. */
  width: number;
}

export interface CanvasImageItem {
  id: string;
  type: 'image';
  /** Blob path "{cyberekId}/{guid}.{ext}" served through the authorized proxy. */
  path: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

/** Order in the items array is the z-order. */
export type CanvasItem = CanvasTextItem | CanvasImageItem;

export interface CanvasDocument {
  version: number;
  canvas: { width: number; height: number; background: string };
  strokes: CanvasStroke[];
  items: CanvasItem[];
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const IMAGE_PATH_PATTERN = /^(\d{1,9})\/[0-9a-fA-F]{32}\.(jpg|png|webp)$/;

export const createEmptyCanvasDocument = (): CanvasDocument => ({
  version: CANVAS_DOCUMENT_VERSION,
  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: CANVAS_BACKGROUND },
  strokes: [],
  items: [],
});

export const serializeCanvasDocument = (document: CanvasDocument): string =>
  JSON.stringify(document);

/**
 * Validates a document against the shared limits (section 3.4). Returns a list
 * of human-readable problems — empty means the document is safe to save.
 * When `authorCyberekId` is known, image ownership is checked too.
 */
export function validateCanvasDocument(
  document: CanvasDocument,
  authorCyberekId?: number | null,
): CanvasValidationError[] {
  const errors: CanvasValidationError[] = [];

  if (document.version !== CANVAS_DOCUMENT_VERSION) {
    errors.push({
      key: 'wishlist.validation.unsupportedVersion',
      params: { version: CANVAS_DOCUMENT_VERSION },
    });
  }

  if (
    document.canvas.width !== CANVAS_WIDTH ||
    document.canvas.height !== CANVAS_HEIGHT
  ) {
    errors.push({
      key: 'wishlist.validation.canvasSize',
      params: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    });
  }

  if (!HEX_COLOR_PATTERN.test(document.canvas.background)) {
    errors.push({ key: 'wishlist.validation.background' });
  }

  validateStrokes(document.strokes, errors);
  validateItems(document.items, authorCyberekId, errors);

  if (errors.length === 0) {
    const jsonBytes = new TextEncoder().encode(serializeCanvasDocument(document)).length;
    if (jsonBytes > DOCUMENT_LIMITS.maxJsonBytes) {
      errors.push({
        key: 'wishlist.validation.documentTooLarge',
        params: {
          size: Math.ceil(jsonBytes / 1024),
          limit: DOCUMENT_LIMITS.maxJsonBytes / 1024,
        },
      });
    }
  }

  return errors;
}

function validateStrokes(strokes: CanvasStroke[], errors: CanvasValidationError[]): void {
  if (strokes.length > DOCUMENT_LIMITS.maxStrokes) {
    errors.push({
      key: 'wishlist.validation.tooManyStrokes',
      params: { limit: DOCUMENT_LIMITS.maxStrokes },
    });
    return;
  }

  for (const stroke of strokes) {
    if (!stroke.id) {
      errors.push({ key: 'wishlist.validation.strokeNoId' });
    }
    if (stroke.tool !== 'pen' && stroke.tool !== 'eraser') {
      errors.push({ key: 'wishlist.validation.strokeTool' });
    }
    if (!HEX_COLOR_PATTERN.test(stroke.color)) {
      errors.push({ key: 'wishlist.validation.strokeColor' });
    }
    if (
      stroke.width < DOCUMENT_LIMITS.minStrokeWidth ||
      stroke.width > DOCUMENT_LIMITS.maxStrokeWidth
    ) {
      errors.push({
        key: 'wishlist.validation.strokeWidth',
        params: { min: DOCUMENT_LIMITS.minStrokeWidth, max: DOCUMENT_LIMITS.maxStrokeWidth },
      });
    }
    if (stroke.points.length === 0 || stroke.points.length % 2 !== 0) {
      errors.push({ key: 'wishlist.validation.strokePoints' });
    }
    if (stroke.points.length > DOCUMENT_LIMITS.maxPointsPerStroke) {
      errors.push({
        key: 'wishlist.validation.strokeTooManyPoints',
        params: { limit: DOCUMENT_LIMITS.maxPointsPerStroke },
      });
    }
    if (stroke.points.some((value) => !Number.isFinite(value))) {
      errors.push({ key: 'wishlist.validation.strokePointsNumbers' });
    }
  }
}

function validateItems(
  items: CanvasItem[],
  authorCyberekId: number | null | undefined,
  errors: CanvasValidationError[],
): void {
  if (items.length > DOCUMENT_LIMITS.maxItems) {
    errors.push({
      key: 'wishlist.validation.tooManyItems',
      params: { limit: DOCUMENT_LIMITS.maxItems },
    });
    return;
  }

  const imageCount = items.filter((item) => item.type === 'image').length;
  if (imageCount > DOCUMENT_LIMITS.maxImageItems) {
    errors.push({
      key: 'wishlist.validation.tooManyImages',
      params: { limit: DOCUMENT_LIMITS.maxImageItems },
    });
  }

  for (const item of items) {
    if (!item.id) {
      errors.push({ key: 'wishlist.validation.itemNoId' });
    }
    if (![item.x, item.y, item.rotation].every(Number.isFinite)) {
      errors.push({ key: 'wishlist.validation.itemCoords' });
    }

    if (item.type === 'text') {
      if (item.text.length === 0) {
        errors.push({ key: 'wishlist.validation.textEmpty' });
      }
      if (item.text.length > DOCUMENT_LIMITS.maxTextLength) {
        errors.push({
          key: 'wishlist.validation.textTooLong',
          params: { limit: DOCUMENT_LIMITS.maxTextLength },
        });
      }
      if (
        item.fontSize < DOCUMENT_LIMITS.minFontSize ||
        item.fontSize > DOCUMENT_LIMITS.maxFontSize
      ) {
        errors.push({
          key: 'wishlist.validation.fontSize',
          params: { min: DOCUMENT_LIMITS.minFontSize, max: DOCUMENT_LIMITS.maxFontSize },
        });
      }
      if (!HEX_COLOR_PATTERN.test(item.fill)) {
        errors.push({ key: 'wishlist.validation.textColor' });
      }
      if (!Number.isFinite(item.width) || item.width <= 0) {
        errors.push({ key: 'wishlist.validation.textWidth' });
      }
    } else {
      const match = IMAGE_PATH_PATTERN.exec(item.path);
      if (!match) {
        errors.push({ key: 'wishlist.validation.imagePath' });
      } else if (
        authorCyberekId != null &&
        Number.parseInt(match[1], 10) !== authorCyberekId
      ) {
        errors.push({ key: 'wishlist.validation.imageNotOwned' });
      }
      if (
        !Number.isFinite(item.width) || item.width <= 0 ||
        !Number.isFinite(item.height) || item.height <= 0
      ) {
        errors.push({ key: 'wishlist.validation.imageSize' });
      }
    }
  }
}

export type ParseCanvasDocumentResult =
  | { document: CanvasDocument; errors: [] }
  | { document: null; errors: CanvasValidationError[] };

/**
 * Parses saved JSON back into a typed document (re-edit flow, requirement 4).
 * The backend stores only validated canonical JSON, so a failure here means a
 * malformed/legacy payload — the caller decides how to degrade.
 */
export function parseCanvasDocument(json: string): ParseCanvasDocumentResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { document: null, errors: [{ key: 'wishlist.validation.invalidJson' }] };
  }

  if (!isRecord(raw) || !isRecord(raw.canvas)) {
    return { document: null, errors: [{ key: 'wishlist.validation.unknownFormat' }] };
  }

  const strokes = Array.isArray(raw.strokes) ? raw.strokes.filter(isStrokeShape) : [];
  const items = Array.isArray(raw.items) ? raw.items.filter(isItemShape) : [];

  const document: CanvasDocument = {
    version: typeof raw.version === 'number' ? raw.version : 0,
    canvas: {
      width: typeof raw.canvas.width === 'number' ? raw.canvas.width : 0,
      height: typeof raw.canvas.height === 'number' ? raw.canvas.height : 0,
      background:
        typeof raw.canvas.background === 'string' ? raw.canvas.background : CANVAS_BACKGROUND,
    },
    strokes,
    items,
  };

  const errors = validateCanvasDocument(document);
  return errors.length === 0 ? { document, errors: [] } : { document: null, errors };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function isStrokeShape(value: unknown): value is CanvasStroke {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.tool === 'pen' || value.tool === 'eraser') &&
    typeof value.color === 'string' &&
    typeof value.width === 'number' &&
    Array.isArray(value.points) &&
    value.points.every((point) => typeof point === 'number')
  );
}

function isItemShape(value: unknown): value is CanvasItem {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return false;
  }
  const hasPlacement =
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.rotation === 'number';

  if (value.type === 'text') {
    return (
      hasPlacement &&
      typeof value.text === 'string' &&
      typeof value.fontSize === 'number' &&
      typeof value.fill === 'string' &&
      typeof value.width === 'number'
    );
  }
  if (value.type === 'image') {
    return (
      hasPlacement &&
      typeof value.path === 'string' &&
      typeof value.width === 'number' &&
      typeof value.height === 'number'
    );
  }
  return false;
}
