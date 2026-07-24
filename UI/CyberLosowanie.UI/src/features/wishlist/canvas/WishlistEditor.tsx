import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useBlocker } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { RootState } from '@/app/store';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/shared/lib/utils';
import { TranslatableError, useTranslation } from '@/shared/i18n';
import {
  extractApiErrorMessage,
  useSaveMyWishlistMutation,
  useUploadWishlistImageMutation,
} from '../wishlistApi';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_PEN_COLOR,
  DEFAULT_STROKE_WIDTH,
  EMOJI_INSERT_FONT_SIZE,
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
import PageCarousel from './PageCarousel';
import EmojiPicker from './EmojiPicker';
import UnsavedChangesDialog from './UnsavedChangesDialog';

// Eraser cursor preview is drawn in a neutral gray (it has no ink color).
const ERASER_CURSOR_COLOR = '#6b7280';

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
  const { t } = useTranslation();
  const engine = useCanvasEngine(initialDocument);
  const [tool, setTool] = useState<EditorTool>('pen');
  const [color, setColor] = useState<string>(DEFAULT_PEN_COLOR);
  const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Set when the in-editor Back button is pressed with unsaved changes; router
  // navigation is caught separately by the blocker below.
  const [backRequested, setBackRequested] = useState(false);

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

  // Catch in-app route navigation (e.g. Navbar links) while there are unsaved
  // changes, so the confirmation dialog below can offer save/discard.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  // Native browser guard for the one thing the router cannot intercept: closing
  // or refreshing the tab. The browser renders this prompt itself (no custom
  // buttons); in-app exits use the UnsavedChangesDialog.
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
    } else if (tool === 'fill' && isBackground) {
      // Fill the current page background with the selected color.
      engine.setPageBackground(color);
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
        throw new Error(response.message || t('wishlist.editor.noImagePath'));
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
        title: t('wishlist.editor.imageAddFailed'),
        description:
          error instanceof TranslatableError
            ? t(error.key, error.params)
            : error instanceof Error
              ? error.message
              : extractApiErrorMessage(error, t('common.error.tryAgainShort')),
        variant: 'destructive',
      });
    }
  };

  // --- save ---------------------------------------------------------------------

  /** Returns true when the wishlist was successfully saved. */
  const handleSave = async (): Promise<boolean> => {
    const document = engine.buildDocument();
    // Client-side mirror of the server limits — a readable warning beats a 400.
    const validationErrors = validateCanvasDocument(document, cyberekId);
    if (validationErrors.length > 0) {
      toast({
        title: t('wishlist.editor.cannotSave'),
        description: t(validationErrors[0].key, validationErrors[0].params),
        variant: 'destructive',
      });
      return false;
    }

    try {
      await saveMyWishlist({ canvasJson: serializeCanvasDocument(document) }).unwrap();
      engine.markSaved();
      toast({ title: t('wishlist.editor.saved') });
      onSaved?.();
      return true;
    } catch (error) {
      toast({
        title: t('wishlist.editor.saveFailed'),
        description: extractApiErrorMessage(error, t('common.error.tryAgainShort')),
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleColorChange = (nextColor: string) => {
    setColor(nextColor);
    // With the fill tool active, choosing a color fills the page immediately.
    if (tool === 'fill') {
      engine.setPageBackground(nextColor);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    // Emojis are text items, so they are movable/scalable/rotatable like text.
    engine.addTextItem(
      (CANVAS_WIDTH - EMOJI_INSERT_FONT_SIZE) / 2,
      (CANVAS_HEIGHT - EMOJI_INSERT_FONT_SIZE) / 2,
      color,
      { text: emoji, fontSize: EMOJI_INSERT_FONT_SIZE, width: EMOJI_INSERT_FONT_SIZE * 1.4 },
    );
    setShowEmojiPicker(false);
    setTool('select');
  };

  // --- leaving with unsaved changes ------------------------------------------

  const unsavedDialogOpen = blocker.state === 'blocked' || backRequested;

  const handleExit = () => {
    if (!onExit) {
      return;
    }
    if (engine.isDirty) {
      setBackRequested(true);
    } else {
      onExit();
    }
  };

  const performExit = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      setBackRequested(false);
      onExit?.();
    }
  };

  const cancelExit = () => {
    setBackRequested(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const saveAndExit = async () => {
    if (await handleSave()) {
      performExit();
    }
  };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onExit && (
            <Button type="button" variant="secondary" size="sm" onClick={handleExit}>
              <ArrowLeft /> {t('common.action.back')}
            </Button>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            {t('wishlist.my.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ZoomControls viewport={viewport} />
          <Button type="button" onClick={handleSave} disabled={isSaving} className="h-11 px-5">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            {t('common.action.save')}
            {engine.isDirty && !isSaving && (
              <span
                className="ml-1 h-2 w-2 rounded-full bg-amber-400"
                title={t('wishlist.editor.unsavedChanges')}
              />
            )}
          </Button>
        </div>
      </div>

      <div className="flex justify-center">
        <PageCarousel
          pageCount={engine.pageCount}
          currentPageIndex={engine.currentPageIndex}
          onGoTo={engine.goToPage}
          editing={{
            canAddPage: engine.canAddPage,
            canDeletePage: engine.canDeletePage,
            onAddPage: engine.addPage,
            onDuplicatePage: engine.duplicatePage,
            onDeletePage: () => {
              if (window.confirm(t('wishlist.pages.deleteConfirm'))) {
                engine.deletePage();
              }
            },
          }}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <CanvasToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={handleColorChange}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          canUndo={engine.canUndo}
          canRedo={engine.canRedo}
          onUndo={engine.undo}
          onRedo={engine.redo}
          hasSelection={engine.selectedItemId !== null}
          onDeleteSelection={() => selectedItemId && removeItem(selectedItemId)}
          onClearAll={() => {
            if (window.confirm(t('wishlist.editor.clearConfirm'))) {
              engine.clearPage();
            }
          }}
          onPickImage={() => fileInputRef.current?.click()}
          onPickEmoji={() => setShowEmojiPicker(true)}
          isUploadingImage={isUploadingImage}
        />

        <div
          ref={viewport.containerRef}
          className={cn(
            'relative flex-1 touch-none overflow-hidden rounded-md shadow-lg',
            // Pen/eraser hide the native cursor — the on-canvas brush circle is the cursor.
            (tool === 'pen' || tool === 'eraser') && 'cursor-none',
            tool === 'text' && 'cursor-text',
            tool === 'fill' && 'cursor-pointer',
          )}
        >
          {viewport.isMeasured && (
            <WishlistCanvas
              strokes={engine.strokes}
              liveStroke={engine.liveStroke}
              items={engine.items}
              background={engine.background}
              brushCursor={
                tool === 'pen' || tool === 'eraser'
                  ? {
                      radius: strokeWidth / 2,
                      color: tool === 'eraser' ? ERASER_CURSOR_COLOR : color,
                    }
                  : null
              }
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

      {showEmojiPicker && (
        <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
      )}

      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        isSaving={isSaving}
        onSave={saveAndExit}
        onDiscard={performExit}
        onCancel={cancelExit}
      />
    </div>
  );
}

export default WishlistEditor;
