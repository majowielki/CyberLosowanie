import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCanvasEngine } from './useCanvasEngine';
import {
  CanvasDocument,
  CanvasTextItem,
  createEmptyCanvasDocument,
  createEmptyPage,
} from './canvasDocument';
import {
  CANVAS_DOCUMENT_VERSION,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOCUMENT_LIMITS,
} from './canvasConstants';

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

  it('clearPage empties the current page but stays undoable', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 1, y: 1 });
      result.current.endStroke();
      result.current.addTextItem(0, 0, '#111827');
    });
    act(() => {
      result.current.clearPage();
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

describe('useCanvasEngine — pages', () => {
  it('starts with a single page', () => {
    const { result } = renderEngine();
    expect(result.current.pageCount).toBe(1);
    expect(result.current.currentPageIndex).toBe(0);
    expect(result.current.canDeletePage).toBe(false);
  });

  it('addPage appends a blank page and switches to it', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.beginStroke('pen', '#e11d48', 6, { x: 1, y: 1 });
      result.current.endStroke();
    });
    act(() => {
      result.current.addPage();
    });

    expect(result.current.pageCount).toBe(2);
    expect(result.current.currentPageIndex).toBe(1);
    expect(result.current.strokes).toHaveLength(0); // the new blank page
    expect(result.current.pages[0].strokes).toHaveLength(1); // the first page is untouched
  });

  it('duplicatePage copies content with fresh ids and switches to the copy', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(10, 10, '#111827');
    });
    act(() => {
      result.current.duplicatePage();
    });

    expect(result.current.pageCount).toBe(2);
    expect(result.current.currentPageIndex).toBe(1);
    expect(result.current.items).toHaveLength(1);
    // Same content, different id.
    const sourceItem = result.current.pages[0].items[0] as CanvasTextItem;
    const copyItem = result.current.items[0] as CanvasTextItem;
    expect(copyItem.text).toBe(sourceItem.text);
    expect(copyItem.id).not.toBe(sourceItem.id);
  });

  it('editing one page does not affect another', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addPage();
    });
    act(() => {
      result.current.addTextItem(5, 5, '#111827');
    });
    act(() => {
      result.current.goToPage(0);
    });

    expect(result.current.currentPageIndex).toBe(0);
    expect(result.current.items).toHaveLength(0); // first page still empty
    expect(result.current.pages[1].items).toHaveLength(1);
  });

  it('deletePage removes the current page and never drops the last one', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addPage();
    });
    expect(result.current.pageCount).toBe(2);

    act(() => {
      result.current.deletePage();
    });
    expect(result.current.pageCount).toBe(1);
    expect(result.current.currentPageIndex).toBe(0);

    // The last remaining page cannot be deleted.
    act(() => {
      result.current.deletePage();
    });
    expect(result.current.pageCount).toBe(1);
  });

  it('cannot add pages beyond the limit', () => {
    const fullDocument: CanvasDocument = {
      version: CANVAS_DOCUMENT_VERSION,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      pages: Array.from({ length: DOCUMENT_LIMITS.maxPages }, () => createEmptyPage()),
    };
    const { result } = renderEngine(fullDocument);

    expect(result.current.canAddPage).toBe(false);

    act(() => {
      result.current.addPage();
    });

    expect(result.current.pageCount).toBe(DOCUMENT_LIMITS.maxPages);
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
  it('buildDocument emits the current pages in the versioned envelope', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(1, 2, '#111827');
    });

    const document = result.current.buildDocument();

    expect(document.version).toBe(CANVAS_DOCUMENT_VERSION);
    expect(document.canvas.width).toBe(CANVAS_WIDTH);
    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].items).toHaveLength(1);
    expect(document.pages[0].strokes).toHaveLength(0);
  });

  it('loadDocument replaces content and resets history and dirt', () => {
    const { result } = renderEngine();

    act(() => {
      result.current.addTextItem(0, 0, '#111827');
    });
    expect(result.current.isDirty).toBe(true);

    const incoming: CanvasDocument = {
      version: CANVAS_DOCUMENT_VERSION,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      pages: [
        {
          id: 'p1',
          background: '#ffffff',
          strokes: [{ id: 's1', tool: 'pen', color: '#22c55e', width: 3, points: [0, 0, 1, 1] }],
          items: [],
        },
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
