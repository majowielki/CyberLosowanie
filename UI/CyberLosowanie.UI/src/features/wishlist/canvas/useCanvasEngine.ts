import { useCallback, useRef, useState } from 'react';
import {
  CanvasDocument,
  CanvasImageItem,
  CanvasItem,
  CanvasStroke,
  CanvasTextItem,
  StrokeTool,
  createEmptyCanvasDocument,
} from './canvasDocument';
import {
  CANVAS_BACKGROUND,
  CANVAS_DOCUMENT_VERSION,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_FONT_SIZE,
  DEFAULT_TEXT_PLACEHOLDER,
  DEFAULT_TEXT_WIDTH,
  MAX_UNDO_STEPS,
} from './canvasConstants';

/** Document content under edit — one undo/redo snapshot. */
interface EngineContent {
  strokes: CanvasStroke[];
  items: CanvasItem[];
}

interface EngineHistory {
  past: EngineContent[];
  present: EngineContent;
  future: EngineContent[];
}

export interface Point {
  x: number;
  y: number;
}

const newElementId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const toContent = (document: CanvasDocument): EngineContent => ({
  strokes: document.strokes,
  items: document.items,
});

/**
 * State of the wishlist document under edit: strokes/items with undo/redo
 * (snapshot stacks), the in-progress stroke and dirty tracking.
 *
 * Drawing performance (doc 5.1): points of the live stroke are appended to a
 * mutable ref and flushed to state through requestAnimationFrame; the stroke is
 * committed to the document (and the undo stack) only when it ends.
 */
export function useCanvasEngine(initialDocument: CanvasDocument) {
  const [history, setHistory] = useState<EngineHistory>(() => ({
    past: [],
    present: toContent(initialDocument),
    future: [],
  }));
  const [liveStroke, setLiveStroke] = useState<CanvasStroke | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const liveStrokeRef = useRef<CanvasStroke | null>(null);
  const frameRequestRef = useRef<number | null>(null);

  /** Applies a new content snapshot, pushing the previous one onto the undo stack. */
  const commit = useCallback((update: (current: EngineContent) => EngineContent) => {
    setHistory((current) => ({
      past: [...current.past.slice(-(MAX_UNDO_STEPS - 1)), current.present],
      present: update(current.present),
      future: [],
    }));
    setIsDirty(true);
  }, []);

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
    commit((content) => ({
      ...content,
      strokes: [...content.strokes, { ...stroke, points }],
    }));
  }, [commit]);

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
    (x: number, y: number, fill: string): CanvasTextItem => {
      const item: CanvasTextItem = {
        id: newElementId(),
        type: 'text',
        text: DEFAULT_TEXT_PLACEHOLDER,
        x,
        y,
        rotation: 0,
        fontSize: DEFAULT_FONT_SIZE,
        fill,
        width: DEFAULT_TEXT_WIDTH,
      };
      commit((content) => ({ ...content, items: [...content.items, item] }));
      setSelectedItemId(item.id);
      return item;
    },
    [commit],
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
      commit((content) => ({ ...content, items: [...content.items, item] }));
      setSelectedItemId(item.id);
      return item;
    },
    [commit],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<CanvasTextItem> & Partial<CanvasImageItem>) => {
      commit((content) => ({
        ...content,
        items: content.items.map((item) =>
          item.id === id ? ({ ...item, ...patch } as CanvasItem) : item,
        ),
      }));
    },
    [commit],
  );

  const removeItem = useCallback(
    (id: string) => {
      commit((content) => ({
        ...content,
        items: content.items.filter((item) => item.id !== id),
      }));
      setSelectedItemId((selected) => (selected === id ? null : selected));
    },
    [commit],
  );

  const clearAll = useCallback(() => {
    cancelStroke();
    setSelectedItemId(null);
    commit(() => ({ strokes: [], items: [] }));
  }, [cancelStroke, commit]);

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
    setHistory({ past: [], present: toContent(document), future: [] });
    setIsDirty(false);
  }, [cancelStroke]);

  const buildDocument = useCallback(
    (): CanvasDocument => ({
      version: CANVAS_DOCUMENT_VERSION,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: CANVAS_BACKGROUND },
      strokes: history.present.strokes,
      items: history.present.items,
    }),
    [history],
  );

  const markSaved = useCallback(() => setIsDirty(false), []);

  return {
    strokes: history.present.strokes,
    items: history.present.items,
    liveStroke,
    selectedItemId,
    setSelectedItemId,
    isDrawing: liveStroke !== null,
    beginStroke,
    extendStroke,
    endStroke,
    cancelStroke,
    addTextItem,
    addImageItem,
    updateItem,
    removeItem,
    clearAll,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    isDirty,
    markSaved,
    loadDocument,
    buildDocument,
  };
}

export type CanvasEngine = ReturnType<typeof useCanvasEngine>;

// Fresh engine content for the "no wishlist yet" case.
export const createInitialDocument = createEmptyCanvasDocument;
