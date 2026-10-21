import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TEXT_PLACEHOLDER } from './canvasConstants';
import { CanvasDocument, CanvasTextItem, createEmptyCanvasDocument, serializeCanvasDocument } from './canvasDocument';
import { clearWishlistDraft, readWishlistDraft, writeWishlistDraft } from './wishlistDraft';

const text = (id: string, value: string): CanvasTextItem => ({
  id,
  type: 'text',
  text: value,
  x: 10,
  y: 20,
  rotation: 0,
  fontSize: 48,
  fill: '#111827',
  width: 600,
  fontFamily: 'caveat',
});

const documentWithItems = (items: CanvasTextItem[]): CanvasDocument => {
  const document = createEmptyCanvasDocument();
  return { ...document, pages: [{ ...document.pages[0], items }] };
};

describe('wishlist draft', () => {
  beforeEach(() => window.localStorage.clear());

  it('restores what was written for the same cyberek only', () => {
    const document = documentWithItems([text('t1', 'Lego')]);
    writeWishlistDraft(7, document);

    expect(readWishlistDraft(7, null)).toEqual(document);
    expect(readWishlistDraft(8, null)).toBeNull();
  });

  it('skips a draft identical to the saved wishlist', () => {
    const document = documentWithItems([text('t1', 'Lego')]);
    writeWishlistDraft(7, document);

    expect(readWishlistDraft(7, serializeCanvasDocument(document))).toBeNull();
  });

  it('leaves out a text still being typed (placeholder only)', () => {
    writeWishlistDraft(7, documentWithItems([text('t1', 'Lego'), text('t2', DEFAULT_TEXT_PLACEHOLDER)]));

    const items = readWishlistDraft(7, null)?.pages[0].items ?? [];
    expect(items.map((item) => item.id)).toEqual(['t1']);
  });

  it('is gone once cleared', () => {
    writeWishlistDraft(7, documentWithItems([text('t1', 'Lego')]));
    clearWishlistDraft(7);

    expect(readWishlistDraft(7, null)).toBeNull();
  });
});
