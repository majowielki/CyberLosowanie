import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCanvasEngine } from './useCanvasEngine';
import {
  CanvasDocument,
  CanvasTextItem,
  createEmptyCanvasDocument,
} from './canvasDocument';
import { CANVAS_DOCUMENT_VERSION } from './canvasConstants';

const renderEngine = (document: CanvasDocument = createEmptyCanvasDocument()) =>
  renderHook(() => useCanvasEngine(document));

describe('useCanvasEngine — drawing', () => {
  it('commits a stroke on endStroke', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 1, y: 2 });
      result.current.extendStroke({ x: 3, y: 4 });
      result.current.endStroke();
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.strokes[0]).toMatchObject({
      tool: 'pen',
      color: '#e11d48',
      width: 6,
      points: [1, 2, 3, 4],
    });
    expect(result.current.liveStroke).toBeNull();
    expect(result.current.isDirty).toBe(true);
  });

  it('duplicates the point of a single tap so a dot is drawn', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 5, y: 6 });
      result.current.endStroke();
    });

    expect(result.current.strokes[0].points).toEqual([5, 6, 5, 6]);
  });

  it('cancelStroke drops the stroke without committing (pinch start)', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('eraser', '#000000', 24, { x: 1, y: 1 });
      result.current.extendStroke({ x: 2, y: 2 });
      result.current.cancelStroke();
    });

    expect(result.current.strokes).toHaveLength(0);
    expect(result.current.liveStroke).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });
});

describe('useCanvasEngine — items', () => {
  it('adds a text item and selects it', () => {
    const { result } = renderEngine();

    let created: CanvasTextItem | undefined;
    act(() => {
      created = result.current.addTextItem(100, 200, '#111827');
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.selectedItemId).toBe(created?.id);
    expect(result.current.items[0]).toMatchObject({ type: 'text', x: 100, y: 200, fill: '#111827' });
  });

  it('adds an image item centered on the canvas', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addImageItem('3/abc.jpg', 400, 300);
    });

    expect(result.current.items[0]).toMatchObject({
      type: 'image',
      path: '3/abc.jpg',
      width: 400,
      height: 300,
    });
  });

  it('updates and removes items, clearing a stale selection', () => {
    const { result } = renderEngine();

    let id = '';
    act(() => {
      id = result.current.addTextItem(0, 0, '#111827').id;
    });
    act(() => {
      result.current.updateItem(id, { text: 'Nowy prezent', rotation: 15 });
    });

    expect(result.current.items[0]).toMatchObject({ text: 'Nowy prezent', rotation: 15 });

    act(() => {
      result.current.removeItem(id);
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.selectedItemId).toBeNull();
  });

  it('clearAll empties strokes and items but stays undoable', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 1, y: 1 });
      result.current.endStroke();
      result.current.addTextItem(0, 0, '#111827');
    });
    act(() => {
      result.current.clearAll();
    });

    expect(result.current.strokes).toHaveLength(0);
    expect(result.current.items).toHaveLength(0);

    act(() => {
      result.current.undo();
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.items).toHaveLength(1);
  });
});

describe('useCanvasEngine — undo/redo', () => {
  it('walks history back and forward', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 1, y: 1 });
      result.current.endStroke();
    });
    act(() => {
      result.current.addTextItem(10, 10, '#111827');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.strokes).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.redo();
      result.current.redo();
    });
    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.canRedo).toBe(false);
  });

  it('a new commit clears the redo branch', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(0, 0, '#111827');
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.addImageItem('3/abc.jpg', 100, 100);
    });

    expect(result.current.canRedo).toBe(false);
    expect(result.current.items[0].type).toBe('image');
  });
});

describe('useCanvasEngine — document io', () => {
  it('buildDocument emits the current content in the versioned envelope', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(1, 2, '#111827');
    });

    const document = result.current.buildDocument();

    expect(document.version).toBe(CANVAS_DOCUMENT_VERSION);
    expect(document.canvas.width).toBeGreaterThan(0);
    expect(document.items).toHaveLength(1);
    expect(document.strokes).toHaveLength(0);
  });

  it('loadDocument replaces content and resets history and dirt', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(0, 0, '#111827');
    });
    expect(result.current.isDirty).toBe(true);

    const incoming = {
      ...createEmptyCanvasDocument(),
      strokes: [
        { id: 's1', tool: 'pen' as const, color: '#22c55e', width: 3, points: [0, 0, 1, 1] },
      ],
    };
    act(() => {
      result.current.loadDocument(incoming);
    });

    expect(result.current.strokes).toHaveLength(1);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
  });

  it('markSaved clears the dirty flag without touching content', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(0, 0, '#111827');
    });
    act(() => {
      result.current.markSaved();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.items).toHaveLength(1);
  });
});
