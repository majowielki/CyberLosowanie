import { describe, expect, it } from 'vitest';
import {
  CanvasDocument,
  CanvasImageItem,
  CanvasStroke,
  CanvasTextItem,
  createEmptyCanvasDocument,
  parseCanvasDocument,
  serializeCanvasDocument,
  validateCanvasDocument,
} from './canvasDocument';
import { DOCUMENT_LIMITS } from './canvasConstants';

const stroke = (overrides: Partial<CanvasStroke> = {}): CanvasStroke => ({
  id: 's1',
  tool: 'pen',
  color: '#e11d48',
  width: 6,
  points: [1, 2, 3, 4],
  ...overrides,
});

const textItem = (overrides: Partial<CanvasTextItem> = {}): CanvasTextItem => ({
  id: 't1',
  type: 'text',
  text: 'Lego Technic 42115',
  x: 100,
  y: 200,
  rotation: 0,
  fontSize: 36,
  fill: '#111827',
  width: 400,
  ...overrides,
});

const imageItem = (overrides: Partial<CanvasImageItem> = {}): CanvasImageItem => ({
  id: 'i1',
  type: 'image',
  path: `3/${'a'.repeat(32)}.jpg`,
  x: 10,
  y: 20,
  rotation: -5,
  width: 300,
  height: 200,
  ...overrides,
});

const documentWith = (partial: Partial<CanvasDocument>): CanvasDocument => ({
  ...createEmptyCanvasDocument(),
  ...partial,
});

describe('validateCanvasDocument', () => {
  it('accepts an empty document', () => {
    expect(validateCanvasDocument(createEmptyCanvasDocument())).toEqual([]);
  });

  it('accepts a document with strokes, text and images', () => {
    const document = documentWith({
      strokes: [stroke(), stroke({ id: 's2', tool: 'eraser', width: 24 })],
      items: [textItem(), imageItem()],
    });
    expect(validateCanvasDocument(document, 3)).toEqual([]);
  });

  it('rejects an unsupported version', () => {
    const document = documentWith({ version: 2 });
    expect(validateCanvasDocument(document)).not.toEqual([]);
  });

  it('rejects a wrong canvas size', () => {
    const document = documentWith({
      canvas: { width: 500, height: 500, background: '#ffffff' },
    });
    expect(validateCanvasDocument(document)).not.toEqual([]);
  });

  it('rejects too many strokes', () => {
    const strokes = Array.from({ length: DOCUMENT_LIMITS.maxStrokes + 1 }, (_, index) =>
      stroke({ id: `s${index}` }),
    );
    expect(validateCanvasDocument(documentWith({ strokes }))).not.toEqual([]);
  });

  it.each([
    ['bad color', stroke({ color: 'red' })],
    ['width below minimum', stroke({ width: 0 })],
    ['width above maximum', stroke({ width: DOCUMENT_LIMITS.maxStrokeWidth + 1 })],
    ['odd point count', stroke({ points: [1, 2, 3] })],
    ['empty points', stroke({ points: [] })],
  ])('rejects a stroke with %s', (_case, badStroke) => {
    expect(validateCanvasDocument(documentWith({ strokes: [badStroke] }))).not.toEqual([]);
  });

  it.each([
    ['empty text', textItem({ text: '' })],
    ['too long text', textItem({ text: 'a'.repeat(DOCUMENT_LIMITS.maxTextLength + 1) })],
    ['font size below minimum', textItem({ fontSize: DOCUMENT_LIMITS.minFontSize - 1 })],
    ['font size above maximum', textItem({ fontSize: DOCUMENT_LIMITS.maxFontSize + 1 })],
    ['bad fill color', textItem({ fill: 'blue' })],
    ['non-positive width', textItem({ width: 0 })],
  ])('rejects a text item with %s', (_case, badItem) => {
    expect(validateCanvasDocument(documentWith({ items: [badItem] }))).not.toEqual([]);
  });

  it('rejects too many images', () => {
    const items = Array.from({ length: DOCUMENT_LIMITS.maxImageItems + 1 }, (_, index) =>
      imageItem({ id: `i${index}` }),
    );
    expect(validateCanvasDocument(documentWith({ items }))).not.toEqual([]);
  });

  it.each([
    ['a traversal attempt', '3/../secret.png'],
    ['a full URL', 'https://evil.example/x.png'],
    ['a wrong extension', `3/${'a'.repeat(32)}.exe`],
  ])('rejects an image path that is %s', (_case, path) => {
    expect(validateCanvasDocument(documentWith({ items: [imageItem({ path })] }))).not.toEqual([]);
  });

  it("rejects an image path under someone else's prefix when the author is known", () => {
    const document = documentWith({
      items: [imageItem({ path: `4/${'a'.repeat(32)}.jpg` })],
    });
    // Owned by cyberek 4, author is 3.
    expect(validateCanvasDocument(document, 3)).not.toEqual([]);
    // Without the author context the shape alone is fine.
    expect(validateCanvasDocument(document)).toEqual([]);
  });

  it('rejects a document exceeding the JSON size limit', () => {
    // Many long-text items instead of one (each stays within the text limit).
    const longText = 'x'.repeat(DOCUMENT_LIMITS.maxTextLength);
    const itemCount = Math.ceil(DOCUMENT_LIMITS.maxJsonBytes / longText.length) + 1;
    const items = Array.from({ length: itemCount }, (_, index) =>
      textItem({ id: `t${index}`, text: longText }),
    );
    const errors = validateCanvasDocument(documentWith({ items }));
    // Exceeds maxItems too — any error is fine, the save must be blocked.
    expect(errors).not.toEqual([]);
  });
});

describe('serialize/parse round trip', () => {
  it('round-trips a full document', () => {
    const original = documentWith({
      strokes: [stroke(), stroke({ id: 's2', tool: 'eraser' })],
      items: [textItem(), imageItem()],
    });

    const result = parseCanvasDocument(serializeCanvasDocument(original));

    expect(result.errors).toEqual([]);
    expect(result.document).toEqual(original);
  });

  it('rejects malformed JSON', () => {
    const result = parseCanvasDocument('this is not json');
    expect(result.document).toBeNull();
    expect(result.errors).not.toEqual([]);
  });

  it('rejects a payload of an unknown shape', () => {
    const result = parseCanvasDocument(JSON.stringify({ hello: 'world' }));
    expect(result.document).toBeNull();
    expect(result.errors).not.toEqual([]);
  });

  it('rejects a document with a wrong version', () => {
    const document = documentWith({ version: 42 });
    const result = parseCanvasDocument(serializeCanvasDocument(document));
    expect(result.document).toBeNull();
  });

  it('drops items of unknown types instead of failing', () => {
    const raw = JSON.stringify({
      ...createEmptyCanvasDocument(),
      items: [textItem(), { id: 'x', type: 'video', x: 0, y: 0, rotation: 0 }],
    });

    const result = parseCanvasDocument(raw);

    expect(result.errors).toEqual([]);
    expect(result.document?.items).toHaveLength(1);
  });
});
