import { describe, expect, it } from 'vitest';
import {
  CanvasDocument,
  CanvasImageItem,
  CanvasPage,
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

const page = (overrides: Partial<CanvasPage> = {}): CanvasPage => ({
  id: 'p1',
  background: '#ffffff',
  strokes: [],
  items: [],
  ...overrides,
});

const documentWith = (partial: Partial<CanvasDocument>): CanvasDocument => ({
  ...createEmptyCanvasDocument(),
  ...partial,
});

describe('validateCanvasDocument', () => {
  it('accepts an empty (single blank page) document', () => {
    expect(validateCanvasDocument(createEmptyCanvasDocument())).toEqual([]);
  });

  it('accepts a multi-page document with strokes, text and images', () => {
    const document = documentWith({
      pages: [
        page({ strokes: [stroke(), stroke({ id: 's2', tool: 'eraser', width: 24 })] }),
        page({ id: 'p2', items: [textItem(), imageItem()] }),
      ],
    });
    expect(validateCanvasDocument(document, 3)).toEqual([]);
  });

  it('rejects an unsupported version', () => {
    expect(validateCanvasDocument(documentWith({ version: 99 }))).not.toEqual([]);
  });

  it('rejects a wrong canvas size', () => {
    const document = documentWith({ canvas: { width: 500, height: 500 } });
    expect(validateCanvasDocument(document)).not.toEqual([]);
  });

  it('rejects a document with no pages', () => {
    expect(validateCanvasDocument(documentWith({ pages: [] }))).not.toEqual([]);
  });

  it('rejects a document with too many pages', () => {
    const pages = Array.from({ length: DOCUMENT_LIMITS.maxPages + 1 }, (_, index) =>
      page({ id: `p${index}` }),
    );
    expect(validateCanvasDocument(documentWith({ pages }))).not.toEqual([]);
  });

  it('rejects a page with a bad background', () => {
    expect(validateCanvasDocument(documentWith({ pages: [page({ background: 'white' })] }))).not.toEqual([]);
  });

  it('rejects too many strokes on a single page', () => {
    const strokes = Array.from({ length: DOCUMENT_LIMITS.maxStrokesPerPage + 1 }, (_, index) =>
      stroke({ id: `s${index}` }),
    );
    expect(validateCanvasDocument(documentWith({ pages: [page({ strokes })] }))).not.toEqual([]);
  });

  it.each([
    ['bad color', stroke({ color: 'red' })],
    ['width below minimum', stroke({ width: 0 })],
    ['width above maximum', stroke({ width: DOCUMENT_LIMITS.maxStrokeWidth + 1 })],
    ['odd point count', stroke({ points: [1, 2, 3] })],
    ['empty points', stroke({ points: [] })],
  ])('rejects a stroke with %s', (_case, badStroke) => {
    expect(validateCanvasDocument(documentWith({ pages: [page({ strokes: [badStroke] })] }))).not.toEqual([]);
  });

  it.each([
    ['empty text', textItem({ text: '' })],
    ['too long text', textItem({ text: 'a'.repeat(DOCUMENT_LIMITS.maxTextLength + 1) })],
    ['font size below minimum', textItem({ fontSize: DOCUMENT_LIMITS.minFontSize - 1 })],
    ['font size above maximum', textItem({ fontSize: DOCUMENT_LIMITS.maxFontSize + 1 })],
    ['bad fill color', textItem({ fill: 'blue' })],
    ['non-positive width', textItem({ width: 0 })],
  ])('rejects a text item with %s', (_case, badItem) => {
    expect(validateCanvasDocument(documentWith({ pages: [page({ items: [badItem] })] }))).not.toEqual([]);
  });

  it('rejects too many images across all pages', () => {
    // Each page stays within limits, but together they exceed the image cap.
    const imagesPerPage = Math.ceil((DOCUMENT_LIMITS.maxImageItems + 1) / 2);
    const makeImages = (prefix: string) =>
      Array.from({ length: imagesPerPage }, (_, index) => imageItem({ id: `${prefix}${index}` }));
    const document = documentWith({
      pages: [
        page({ id: 'p1', items: makeImages('a') }),
        page({ id: 'p2', items: makeImages('b') }),
      ],
    });
    expect(validateCanvasDocument(document, 3)).not.toEqual([]);
  });

  it.each([
    ['a traversal attempt', '3/../secret.png'],
    ['a full URL', 'https://evil.example/x.png'],
    ['a wrong extension', `3/${'a'.repeat(32)}.exe`],
  ])('rejects an image path that is %s', (_case, path) => {
    const document = documentWith({ pages: [page({ items: [imageItem({ path })] })] });
    expect(validateCanvasDocument(document)).not.toEqual([]);
  });

  it("rejects an image path under someone else's prefix when the author is known", () => {
    const document = documentWith({
      pages: [page({ items: [imageItem({ path: `4/${'a'.repeat(32)}.jpg` })] })],
    });
    // Owned by cyberek 4, author is 3.
    expect(validateCanvasDocument(document, 3)).not.toEqual([]);
    // Without the author context the shape alone is fine.
    expect(validateCanvasDocument(document)).toEqual([]);
  });

  it('rejects a document exceeding the JSON size limit', () => {
    // A handful of max-length strokes on one page push the JSON past 512 KB
    // without hitting any structural per-page limit.
    const bigPoints = Array.from({ length: DOCUMENT_LIMITS.maxPointsPerStroke }, () => 999999);
    const strokes = Array.from({ length: 5 }, (_, index) =>
      stroke({ id: `s${index}`, points: bigPoints }),
    );
    const errors = validateCanvasDocument(documentWith({ pages: [page({ strokes })] }));
    expect(errors.some((e) => e.key === 'wishlist.validation.documentTooLarge')).toBe(true);
  });
});

describe('serialize/parse round trip', () => {
  it('round-trips a multi-page document', () => {
    const original = documentWith({
      pages: [
        page({ strokes: [stroke(), stroke({ id: 's2', tool: 'eraser' })] }),
        page({ id: 'p2', items: [textItem(), imageItem()] }),
      ],
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
    const raw = JSON.stringify(
      documentWith({
        pages: [
          {
            id: 'p1',
            background: '#ffffff',
            strokes: [],
            items: [textItem(), { id: 'x', type: 'video', x: 0, y: 0, rotation: 0 }],
          } as unknown as CanvasPage,
        ],
      }),
    );

    const result = parseCanvasDocument(raw);

    expect(result.errors).toEqual([]);
    expect(result.document?.pages[0].items).toHaveLength(1);
  });
});
