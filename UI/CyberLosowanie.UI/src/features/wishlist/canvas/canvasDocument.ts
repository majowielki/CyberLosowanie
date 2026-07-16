// Types, (de)serialization and validation of the wishlist canvas document —
// the client-side mirror of the backend model (Models/Dto/CanvasDocument.cs)
// and its validator. Validation runs before saving so the user gets a readable
// warning instead of a 400 from the server.

import {
  CANVAS_BACKGROUND,
  CANVAS_DOCUMENT_VERSION,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOCUMENT_LIMITS,
} from './canvasConstants';

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
): string[] {
  const errors: string[] = [];

  if (document.version !== CANVAS_DOCUMENT_VERSION) {
    errors.push(`Nieobsługiwana wersja dokumentu (oczekiwano ${CANVAS_DOCUMENT_VERSION}).`);
  }

  if (
    document.canvas.width !== CANVAS_WIDTH ||
    document.canvas.height !== CANVAS_HEIGHT
  ) {
    errors.push(`Płótno musi mieć rozmiar ${CANVAS_WIDTH}x${CANVAS_HEIGHT}.`);
  }

  if (!HEX_COLOR_PATTERN.test(document.canvas.background)) {
    errors.push('Tło płótna musi być kolorem w formacie #rrggbb.');
  }

  validateStrokes(document.strokes, errors);
  validateItems(document.items, authorCyberekId, errors);

  if (errors.length === 0) {
    const jsonBytes = new TextEncoder().encode(serializeCanvasDocument(document)).length;
    if (jsonBytes > DOCUMENT_LIMITS.maxJsonBytes) {
      errors.push(
        `Lista jest zbyt duża (${Math.ceil(jsonBytes / 1024)} KB, limit ${DOCUMENT_LIMITS.maxJsonBytes / 1024} KB). Usuń część elementów.`,
      );
    }
  }

  return errors;
}

function validateStrokes(strokes: CanvasStroke[], errors: string[]): void {
  if (strokes.length > DOCUMENT_LIMITS.maxStrokes) {
    errors.push(`Za dużo pociągnięć (limit ${DOCUMENT_LIMITS.maxStrokes}).`);
    return;
  }

  for (const stroke of strokes) {
    if (!stroke.id) {
      errors.push('Pociągnięcie bez identyfikatora.');
    }
    if (stroke.tool !== 'pen' && stroke.tool !== 'eraser') {
      errors.push('Nieznane narzędzie pociągnięcia.');
    }
    if (!HEX_COLOR_PATTERN.test(stroke.color)) {
      errors.push('Kolor pociągnięcia musi być w formacie #rrggbb.');
    }
    if (
      stroke.width < DOCUMENT_LIMITS.minStrokeWidth ||
      stroke.width > DOCUMENT_LIMITS.maxStrokeWidth
    ) {
      errors.push(
        `Grubość pociągnięcia musi być w zakresie ${DOCUMENT_LIMITS.minStrokeWidth}–${DOCUMENT_LIMITS.maxStrokeWidth}.`,
      );
    }
    if (stroke.points.length === 0 || stroke.points.length % 2 !== 0) {
      errors.push('Punkty pociągnięcia muszą być parami współrzędnych x,y.');
    }
    if (stroke.points.length > DOCUMENT_LIMITS.maxPointsPerStroke) {
      errors.push(`Pociągnięcie ma za dużo punktów (limit ${DOCUMENT_LIMITS.maxPointsPerStroke}).`);
    }
    if (stroke.points.some((value) => !Number.isFinite(value))) {
      errors.push('Punkty pociągnięcia muszą być liczbami.');
    }
  }
}

function validateItems(
  items: CanvasItem[],
  authorCyberekId: number | null | undefined,
  errors: string[],
): void {
  if (items.length > DOCUMENT_LIMITS.maxItems) {
    errors.push(`Za dużo elementów (limit ${DOCUMENT_LIMITS.maxItems}).`);
    return;
  }

  const imageCount = items.filter((item) => item.type === 'image').length;
  if (imageCount > DOCUMENT_LIMITS.maxImageItems) {
    errors.push(`Za dużo zdjęć (limit ${DOCUMENT_LIMITS.maxImageItems}).`);
  }

  for (const item of items) {
    if (!item.id) {
      errors.push('Element bez identyfikatora.');
    }
    if (![item.x, item.y, item.rotation].every(Number.isFinite)) {
      errors.push('Współrzędne elementu muszą być liczbami.');
    }

    if (item.type === 'text') {
      if (item.text.length === 0) {
        errors.push('Tekst nie może być pusty.');
      }
      if (item.text.length > DOCUMENT_LIMITS.maxTextLength) {
        errors.push(`Tekst jest za długi (limit ${DOCUMENT_LIMITS.maxTextLength} znaków).`);
      }
      if (
        item.fontSize < DOCUMENT_LIMITS.minFontSize ||
        item.fontSize > DOCUMENT_LIMITS.maxFontSize
      ) {
        errors.push(
          `Rozmiar czcionki musi być w zakresie ${DOCUMENT_LIMITS.minFontSize}–${DOCUMENT_LIMITS.maxFontSize}.`,
        );
      }
      if (!HEX_COLOR_PATTERN.test(item.fill)) {
        errors.push('Kolor tekstu musi być w formacie #rrggbb.');
      }
      if (!Number.isFinite(item.width) || item.width <= 0) {
        errors.push('Szerokość tekstu musi być dodatnia.');
      }
    } else {
      const match = IMAGE_PATH_PATTERN.exec(item.path);
      if (!match) {
        errors.push('Nieprawidłowa ścieżka zdjęcia.');
      } else if (
        authorCyberekId != null &&
        Number.parseInt(match[1], 10) !== authorCyberekId
      ) {
        errors.push('Zdjęcie nie należy do Twojej listy życzeń.');
      }
      if (
        !Number.isFinite(item.width) || item.width <= 0 ||
        !Number.isFinite(item.height) || item.height <= 0
      ) {
        errors.push('Wymiary zdjęcia muszą być dodatnie.');
      }
    }
  }
}

export type ParseCanvasDocumentResult =
  | { document: CanvasDocument; errors: [] }
  | { document: null; errors: string[] };

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
    return { document: null, errors: ['Dokument listy życzeń nie jest poprawnym JSON-em.'] };
  }

  if (!isRecord(raw) || !isRecord(raw.canvas)) {
    return { document: null, errors: ['Dokument listy życzeń ma nieznany format.'] };
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
