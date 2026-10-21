import { DEFAULT_TEXT_PLACEHOLDER } from './canvasConstants';
import { CanvasDocument, parseCanvasDocument, serializeCanvasDocument } from './canvasDocument';

/**
 * Unsaved editor changes kept in this browser (per cyberek), so they survive
 * what the editor cannot intercept on phones: the system Back leaving the tab,
 * the OS killing a backgrounded browser, a reload. A convenience only — the
 * server copy stays the source of truth, and storage may be unavailable
 * (private mode, blocked site data), so every access is guarded.
 */
const draftKey = (cyberekId: number) => `wishlist-draft:${cyberekId}`;

export function readWishlistDraft(
  cyberekId: number | null | undefined,
  savedCanvasJson: string | null,
): CanvasDocument | null {
  if (cyberekId == null) {
    return null;
  }
  try {
    const json = window.localStorage.getItem(draftKey(cyberekId));
    if (!json || json === savedCanvasJson) {
      return null;
    }
    const parsed = parseCanvasDocument(json);
    return parsed.errors.length === 0 ? parsed.document : null;
  } catch {
    return null;
  }
}

export function writeWishlistDraft(cyberekId: number | null | undefined, document: CanvasDocument) {
  if (cyberekId == null) {
    return;
  }
  // A text still being typed holds only the placeholder; restored, it would
  // turn into a literal "Wpisz tekst..." on the page.
  const withoutPlaceholders: CanvasDocument = {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.type !== 'text' || item.text !== DEFAULT_TEXT_PLACEHOLDER),
    })),
  };
  try {
    window.localStorage.setItem(draftKey(cyberekId), serializeCanvasDocument(withoutPlaceholders));
  } catch {
    // Quota or blocked storage: the draft is best-effort.
  }
}

export function clearWishlistDraft(cyberekId: number | null | undefined) {
  if (cyberekId == null) {
    return;
  }
  try {
    window.localStorage.removeItem(draftKey(cyberekId));
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
