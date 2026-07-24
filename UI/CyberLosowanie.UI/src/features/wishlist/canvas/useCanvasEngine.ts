import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CanvasDocument,
  CanvasImageItem,
  CanvasItem,
  CanvasPage,
  CanvasStroke,
  CanvasTextItem,
  StrokeTool,
  createEmptyPage,
} from './canvasDocument';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_PLACEHOLDER,
  DEFAULT_TEXT_WIDTH,
  DOCUMENT_LIMITS,
  CANVAS_DOCUMENT_VERSION,
  MAX_UNDO_STEPS,
} from './canvasConstants';

/** Undo/redo snapshot: the whole page list (page navigation is not undoable). */
type EngineHistory = {
  past: CanvasPage[][];
  present: CanvasPage[];
  future: CanvasPage[][];
};

export interface Point {
  x: number;
  y: number;
}

const newElementId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// Deep copy with fresh ids — a duplicated page must not share element ids with
// its source (ids must stay unique so selection/transform target one element).
const clonePageWithNewIds = (page: CanvasPage): CanvasPage => ({
  id: newElementId(),
  background: page.background,
  strokes: page.strokes.map((stroke) => ({ ...stroke, id: newElementId(), points: [...stroke.points] })),
  items: page.items.map((item) => ({ ...item, id: newElementId() })),
});

/**
 * State of the wishlist document under edit: a list of pages (with undo/redo
 * snapshot stacks), the active page index, the in-progress stroke and dirty
 * tracking. All stroke/item operations act on the current page.
 *
 * Drawing performance (doc 5.1): points of the live stroke are appended to a
 * mutable ref and flushed to state through requestAnimationFrame; the stroke is
 * committed to the document (and the undo stack) only when it ends.
 */
export function useCanvasEngine(initialDocument: CanvasDocument) {
  const [history, setHistory] = useState<EngineHistory>(() => ({
    past: [],
    present: initialDocument.pages,
    future: [],
  }));
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [liveStroke, setLiveStroke] = useState<CanvasStroke | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const liveStrokeRef = useRef<CanvasStroke | null>(null);
  const frameRequestRef = useRef<number | null>(null);

  const pages = history.present;
  // The state index can briefly point past the end (right after undo/delete);
  // this clamped value is the single source of truth for what renders.
  const activeIndex = Math.min(Math.max(currentPageIndex, 0), pages.length - 1);
  const currentPage = pages[activeIndex];

  // Keep the stored index in range whenever the page count shrinks (undo/delete).
  useEffect(() => {
    setCurrentPageIndex((index) => Math.min(Math.max(index, 0), pages.length - 1));
  }, [pages.length]);

  /** Pushes the present page list onto the undo stack and applies an update. */
  const commitPages = useCallback((update: (pages: CanvasPage[]) => CanvasPage[]) => {
    setHistory((current) => ({
      past: [...current.past.slice(-(MAX_UNDO_STEPS - 1)), current.present],
      present: update(current.present),
      future: [],
    }));
    setIsDirty(true);
  }, []);

  /** Commits a change to the current page only. */
  const updateCurrentPage = useCallback(
    (update: (page: CanvasPage) => CanvasPage) => {
      commitPages((current) =>
        current.map((page, index) => (index === activeIndex ? update(page) : page)),
      );
    },
    [commitPages, activeIndex],
  );

  // --- freehand drawing ------------------------------------------------------

  const flushLiveStroke = useCallback(() => {
    frameRequestRef.current = null;
    const stroke = liveStrokeRef.current;
    if (stroke) {
      setLiveStroke({ ...stroke, points: [...stroke.points] });
    }
  }, []);

  const beginStroke = useCallback(
    (tool: StrokeTool, color: string, width: number, point: Point) => {
      liveStrokeRef.current = {
        id: newElementId(),
        tool,
        color,
        width,
        points: [point.x, point.y],
      };
      setLiveStroke({ ...liveStrokeRef.current });
    },
    [],
  );

  const extendStroke = useCallback(
    (point: Point) => {
      const stroke = liveStrokeRef.current;
      if (!stroke) {
        return;
      }
      stroke.points.push(point.x, point.y);
      if (frameRequestRef.current === null) {
        frameRequestRef.current = requestAnimationFrame(flushLiveStroke);
      }
    },
    [flushLiveStroke],
  );

  const endStroke = useCallback(() => {
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    setLiveStroke(null);
    if (!stroke) {
      return;
    }
    // A single tap leaves one point pair — duplicate it so Konva draws a dot.
    const points = stroke.points.length === 2
      ? [...stroke.points, stroke.points[0], stroke.points[1]]
      : [...stroke.points];
    updateCurrentPage((page) => ({ ...page, strokes: [...page.strokes, { ...stroke, points }] }));
  }, [updateCurrentPage]);

  /** Drops the in-progress stroke without committing (e.g. a pinch gesture started). */
  const cancelStroke = useCallback(() => {
    liveStrokeRef.current = null;
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    setLiveStroke(null);
  }, []);

  // --- items (text / image) --------------------------------------------------

  const addTextItem = useCallback(
    (
      x: number,
      y: number,
      fill: string,
      options?: { text?: string; fontSize?: number; width?: number },
    ): CanvasTextItem => {
      const fontSize = options?.fontSize ?? DEFAULT_FONT_SIZE;
      const item: CanvasTextItem = {
        id: newElementId(),
        type: 'text',
        text: options?.text ?? DEFAULT_TEXT_PLACEHOLDER,
        x,
        y,
        rotation: 0,
        fontSize,
        fill,
        width: options?.width ?? DEFAULT_TEXT_WIDTH,
      };
      updateCurrentPage((page) => ({ ...page, items: [...page.items, item] }));
      setSelectedItemId(item.id);
      return item;
    },
    [updateCurrentPage],
  );

  const addImageItem = useCallback(
    (path: string, width: number, height: number): CanvasImageItem => {
      const item: CanvasImageItem = {
        id: newElementId(),
        type: 'image',
        path,
        x: (CANVAS_WIDTH - width) / 2,
        y: (CANVAS_HEIGHT - height) / 2,
        rotation: 0,
        width,
        height,
      };
      updateCurrentPage((page) => ({ ...page, items: [...page.items, item] }));
      setSelectedItemId(item.id);
      return item;
    },
    [updateCurrentPage],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<CanvasTextItem> & Partial<CanvasImageItem>) => {
      updateCurrentPage((page) => ({
        ...page,
        items: page.items.map((item) =>
          item.id === id ? ({ ...item, ...patch } as CanvasItem) : item,
        ),
      }));
    },
    [updateCurrentPage],
  );

  const removeItem = useCallback(
    (id: string) => {
      updateCurrentPage((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== id),
      }));
      setSelectedItemId((selected) => (selected === id ? null : selected));
    },
    [updateCurrentPage],
  );

  /** Clears the current page (strokes + items); other pages are untouched. */
  const clearPage = useCallback(() => {
    cancelStroke();
    setSelectedItemId(null);
    updateCurrentPage((page) => ({ ...page, strokes: [], items: [] }));
  }, [cancelStroke, updateCurrentPage]);

  /** Fills the current page background with a color (#rrggbb). */
  const setPageBackground = useCallback(
    (color: string) => {
      updateCurrentPage((page) => ({ ...page, background: color }));
    },
    [updateCurrentPage],
  );

  // --- pages -----------------------------------------------------------------

  const canAddPage = pages.length < DOCUMENT_LIMITS.maxPages;
  const canDeletePage = pages.length > 1;

  const addPage = useCallback(() => {
    if (pages.length >= DOCUMENT_LIMITS.maxPages) {
      return;
    }
    cancelStroke();
    setSelectedItemId(null);
    commitPages((current) => [...current, createEmptyPage()]);
    setCurrentPageIndex(pages.length); // the appended page
  }, [pages.length, cancelStroke, commitPages]);

  const duplicatePage = useCallback(() => {
    if (pages.length >= DOCUMENT_LIMITS.maxPages) {
      return;
    }
    cancelStroke();
    setSelectedItemId(null);
    const insertIndex = activeIndex + 1;
    commitPages((current) => [
      ...current.slice(0, insertIndex),
      clonePageWithNewIds(current[activeIndex]),
      ...current.slice(insertIndex),
    ]);
    setCurrentPageIndex(insertIndex);
  }, [pages.length, activeIndex, cancelStroke, commitPages]);

  const deletePage = useCallback(() => {
    if (pages.length <= 1) {
      return;
    }
    cancelStroke();
    setSelectedItemId(null);
    const removeIndex = activeIndex;
    commitPages((current) => current.filter((_, index) => index !== removeIndex));
    setCurrentPageIndex(Math.min(removeIndex, pages.length - 2));
  }, [pages.length, activeIndex, cancelStroke, commitPages]);

  const goToPage = useCallback(
    (index: number) => {
      cancelStroke();
      setSelectedItemId(null);
      setCurrentPageIndex(Math.min(Math.max(index, 0), pages.length - 1));
    },
    [cancelStroke, pages.length],
  );

  // --- undo / redo -----------------------------------------------------------

  const undo = useCallback(() => {
    cancelStroke();
    setSelectedItemId(null);
    setHistory((current) => {
      if (current.past.length === 0) {
        return current;
      }
      return {
        past: current.past.slice(0, -1),
        present: current.past[current.past.length - 1],
        future: [current.present, ...current.future],
      };
    });
    setIsDirty(true);
  }, [cancelStroke]);

  const redo = useCallback(() => {
    cancelStroke();
    setSelectedItemId(null);
    setHistory((current) => {
      if (current.future.length === 0) {
        return current;
      }
      return {
        past: [...current.past, current.present],
        present: current.future[0],
        future: current.future.slice(1),
      };
    });
    setIsDirty(true);
  }, [cancelStroke]);

  // --- document io -----------------------------------------------------------

  const loadDocument = useCallback((document: CanvasDocument) => {
    cancelStroke();
    setSelectedItemId(null);
    setHistory({ past: [], present: document.pages, future: [] });
    setCurrentPageIndex(0);
    setIsDirty(false);
  }, [cancelStroke]);

  const buildDocument = useCallback(
    (): CanvasDocument => ({
      version: CANVAS_DOCUMENT_VERSION,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      pages: history.present,
    }),
    [history],
  );

  const markSaved = useCallback(() => setIsDirty(false), []);

  return {
    // current page content
    strokes: currentPage.strokes,
    items: currentPage.items,
    background: currentPage.background,
    liveStroke,
    selectedItemId,
    setSelectedItemId,
    isDrawing: liveStroke !== null,
    // drawing
    beginStroke,
    extendStroke,
    endStroke,
    cancelStroke,
    // items
    addTextItem,
    addImageItem,
    updateItem,
    removeItem,
    clearPage,
    setPageBackground,
    // pages
    pages,
    pageCount: pages.length,
    currentPageIndex: activeIndex,
    canAddPage,
    canDeletePage,
    addPage,
    duplicatePage,
    deletePage,
    goToPage,
    // history
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    // io
    isDirty,
    markSaved,
    loadDocument,
    buildDocument,
  };
}

export type CanvasEngine = ReturnType<typeof useCanvasEngine>;
