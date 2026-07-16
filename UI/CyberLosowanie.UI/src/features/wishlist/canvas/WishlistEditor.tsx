import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { RootState } from '@/app/store';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/shared/lib/utils';
import {
  extractApiErrorMessage,
  useSaveMyWishlistMutation,
  useUploadWishlistImageMutation,
} from '../wishlistApi';
import {
  CANVAS_WIDTH,
  DEFAULT_PEN_COLOR,
  DEFAULT_STROKE_WIDTH,
  IMAGE_INSERT_MAX_WIDTH_RATIO,
} from './canvasConstants';
import {
  CanvasDocument,
  CanvasTextItem,
  serializeCanvasDocument,
  validateCanvasDocument,
} from './canvasDocument';
import { IMAGE_FILE_ACCEPT, prepareImageForUpload } from './imageUtils';
import CanvasToolbar, { EditorTool } from './CanvasToolbar';
import TextEditOverlay from './TextEditOverlay';
import { useCanvasEngine, Point } from './useCanvasEngine';
import { useStageViewport } from './useStageViewport';
import WishlistCanvas from './WishlistCanvas';
import ZoomControls from './ZoomControls';

interface WishlistEditorProps {
  initialDocument: CanvasDocument;
  /** Shown as a back button when the page has a preview mode to return to. */
  onExit?: () => void;
  /** Called after a successful save (the page switches back to preview). */
  onSaved?: () => void;
}

/**
 * The wishlist canvas editor (doc 5.3): toolbar + canvas + top bar with zoom
 * and save. Composes the isolated Konva pieces — document state in
 * useCanvasEngine, viewport in useStageViewport, rendering in WishlistCanvas.
 */
function WishlistEditor({ initialDocument, onExit, onSaved }: WishlistEditorProps) {
  const engine = useCanvasEngine(initialDocument);
  const [tool, setTool] = useState<EditorTool>('pen');
  const [color, setColor] = useState<string>(DEFAULT_PEN_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const viewport = useStageViewport({
    panEnabled: tool === 'select',
    // A pinch that starts mid-stroke means the finger was zooming, not drawing.
    onPinchStart: engine.cancelStroke,
  });

  const [saveMyWishlist, { isLoading: isSaving }] = useSaveMyWishlistMutation();
  const [uploadWishlistImage, { isLoading: isUploadingImage }] = useUploadWishlistImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);

  const { selectedItemId, removeItem, isDirty } = engine;

  // Native browser guard for closing/refreshing the tab with unsaved changes;
  // in-app navigation is guarded by the exit button confirm below.
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Delete/Backspace removes the selection (unless the user is typing).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (editingTextId || !selectedItemId ||
          target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }
      removeItem(selectedItemId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTextId, selectedItemId, removeItem]);

  // --- pointer routing per tool ----------------------------------------------

  const handlePointerDown = (position: Point, isBackground: boolean) => {
    if (viewport.isPinching()) {
      return;
    }
    if (tool === 'pen' || tool === 'eraser') {
      engine.beginStroke(tool, color, strokeWidth, position);
    } else if (tool === 'text' && isBackground) {
      const item = engine.addTextItem(position.x, position.y, color);
      setEditingTextId(item.id);
      setTool('select');
    } else if (tool === 'select' && isBackground) {
      engine.setSelectedItemId(null);
    }
  };

  const handlePointerMove = (position: Point) => {
    if (viewport.isPinching()) {
      engine.cancelStroke();
      return;
    }
    engine.extendStroke(position);
  };

  // --- text editing overlay ---------------------------------------------------

  const editingTextItem = engine.items.find(
    (item): item is CanvasTextItem => item.type === 'text' && item.id === editingTextId,
  );

  const handleTextCommit = (text: string) => {
    if (editingTextItem) {
      const trimmed = text.trim();
      if (!trimmed) {
        engine.removeItem(editingTextItem.id);
      } else if (trimmed !== editingTextItem.text) {
        engine.updateItem(editingTextItem.id, { text: trimmed });
      }
    }
    setEditingTextId(null);
  };

  // --- image insertion ---------------------------------------------------------

  const handleImageFilePicked = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    try {
      const prepared = await prepareImageForUpload(file);
      const response = await uploadWishlistImage(prepared.file).unwrap();
      const path = response.data?.path;
      if (!path) {
        throw new Error(response.message || 'Serwer nie zwrócił ścieżki zdjęcia.');
      }
      // Insert at a comfortable size; exact placement is tuned with the transformer.
      const insertScale = Math.min(
        1,
        (CANVAS_WIDTH * IMAGE_INSERT_MAX_WIDTH_RATIO) / prepared.width,
      );
      engine.addImageItem(
        path,
        Math.round(prepared.width * insertScale),
        Math.round(prepared.height * insertScale),
      );
      setTool('select');
    } catch (error) {
      toast({
        title: 'Nie udało się dodać zdjęcia',
        description:
          error instanceof Error
            ? error.message
            : extractApiErrorMessage(error, 'Spróbuj ponownie.'),
        variant: 'destructive',
      });
    }
  };

  // --- save ---------------------------------------------------------------------

  const handleSave = async () => {
    const document = engine.buildDocument();
    // Client-side mirror of the server limits — a readable warning beats a 400.
    const validationErrors = validateCanvasDocument(document, cyberekId);
    if (validationErrors.length > 0) {
      toast({
        title: 'Nie można zapisać listy',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveMyWishlist({ canvasJson: serializeCanvasDocument(document) }).unwrap();
      engine.markSaved();
      toast({ title: 'Lista życzeń zapisana' });
      onSaved?.();
    } catch (error) {
      toast({
        title: 'Zapis nie powiódł się',
        description: extractApiErrorMessage(error, 'Spróbuj ponownie.'),
        variant: 'destructive',
      });
    }
  };

  const handleExit = () => {
    if (!onExit) {
      return;
    }
    if (!engine.isDirty || window.confirm('Masz niezapisane zmiany. Wyjść bez zapisywania?')) {
      onExit();
    }
  };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onExit && (
            <Button type="button" variant="secondary" size="sm" onClick={handleExit}>
              <ArrowLeft /> Wróć
            </Button>
          )}
          <h1 className="text-xl font-bold text-white">Moja lista życzeń</h1>
        </div>
        <div className="flex items-center gap-2">
          <ZoomControls viewport={viewport} />
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Zapisz
            {engine.isDirty && !isSaving && (
              <span
                className="ml-1 h-2 w-2 rounded-full bg-amber-400"
                title="Niezapisane zmiany"
              />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <CanvasToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          canUndo={engine.canUndo}
          canRedo={engine.canRedo}
          onUndo={engine.undo}
          onRedo={engine.redo}
          hasSelection={engine.selectedItemId !== null}
          onDeleteSelection={() => selectedItemId && removeItem(selectedItemId)}
          onClearAll={() => {
            if (window.confirm('Wyczyścić całe płótno?')) {
              engine.clearAll();
            }
          }}
          onPickImage={() => fileInputRef.current?.click()}
          isUploadingImage={isUploadingImage}
        />

        <div
          ref={viewport.containerRef}
          className={cn(
            'relative flex-1 touch-none overflow-hidden rounded-md shadow-lg',
            (tool === 'pen' || tool === 'eraser') && 'cursor-crosshair',
            tool === 'text' && 'cursor-text',
          )}
        >
          {viewport.isMeasured && (
            <WishlistCanvas
              strokes={engine.strokes}
              liveStroke={engine.liveStroke}
              items={engine.items}
              stageProps={viewport.stageProps}
              editable
              itemsInteractive={tool === 'select'}
              selectedItemId={engine.selectedItemId}
              editingItemId={editingTextId}
              onSelectItem={engine.setSelectedItemId}
              onItemChange={engine.updateItem}
              onTextEditRequest={setEditingTextId}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={engine.endStroke}
            />
          )}
          {editingTextItem && (
            <TextEditOverlay
              item={editingTextItem}
              stageScale={viewport.stageScale}
              stagePosition={viewport.stagePosition}
              onCommit={handleTextCommit}
              onCancel={() => setEditingTextId(null)}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file again re-triggers onChange.
          event.target.value = '';
          void handleImageFilePicked(file);
        }}
      />
    </div>
  );
}

export default WishlistEditor;
