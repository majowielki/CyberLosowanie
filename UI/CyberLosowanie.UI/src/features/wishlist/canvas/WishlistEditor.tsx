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
  DEFAULT_SHAPE_SIZE,
  DEFAULT_STROKE_KIND,
  DEFAULT_STROKE_WIDTH,
  SHAPE_DRAG_THRESHOLD,
  EMOJI_INSERT_FONT_SIZE,
  IMAGE_INSERT_MAX_WIDTH_RATIO,
} from './canvasConstants';
import {
  CanvasDocument,
  CanvasShapeItem,
  CanvasTextItem,
  ShapeKind,
  StrokeKind,
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
import ConfirmDialog, { PendingConfirmation } from './ConfirmDialog';

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
  const [strokeKind, setStrokeKind] = useState<StrokeKind>(DEFAULT_STROKE_KIND);
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  const [shapeFilled, setShapeFilled] = useState(false);
  // Shape tool: the bounding box being dragged out (preview until pointer up).
  const shapeOriginRef = useRef<Point | null>(null);
  const [shapeDraft, setShapeDraft] = useState<CanvasShapeItem | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Set when the in-editor Back button is pressed with unsaved changes; router
  // navigation is caught separately by the blocker below.
  const [backRequested, setBackRequested] = useState(false);
  // Destructive actions (clear page, delete page) ask first, in-app.
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

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
      engine.beginStroke(tool, color, strokeWidth, position, strokeKind);
    } else if (tool === 'text' && isBackground) {
      const item = engine.addTextItem(position.x, position.y, color);
      setEditingTextId(item.id);
      setTool('select');
    } else if (tool === 'shape') {
      shapeOriginRef.current = position;
      setShapeDraft(shapeAt(position, position));
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
      shapeOriginRef.current = null;
      setShapeDraft(null);
      return;
    }
    if (shapeOriginRef.current) {
      setShapeDraft(shapeAt(shapeOriginRef.current, position));
      return;
    }
    engine.extendStroke(position);
  };

  const handlePointerUp = () => {
    const origin = shapeOriginRef.current;
    if (origin && shapeDraft) {
      shapeOriginRef.current = null;
      setShapeDraft(null);
      // A plain click (no real drag) drops a default-sized shape centred on it.
      const dragged =
        Math.max(shapeDraft.width, shapeDraft.height) >= SHAPE_DRAG_THRESHOLD;
      const committed = dragged
        ? shapeDraft
        : {
            ...shapeDraft,
            x: origin.x - DEFAULT_SHAPE_SIZE / 2,
            y: origin.y - DEFAULT_SHAPE_SIZE / 2,
            width: DEFAULT_SHAPE_SIZE,
            height: DEFAULT_SHAPE_SIZE,
          };
      engine.addShapeItem({
        shape: committed.shape,
        x: committed.x,
        y: committed.y,
        rotation: 0,
        width: committed.width,
        height: committed.height,
        stroke: committed.stroke,
        strokeWidth: committed.strokeWidth,
        ...(committed.fill ? { fill: committed.fill } : {}),
      });
      // Hand over to the pointer so the new shape can be adjusted right away.
      setTool('select');
      return;
    }
    engine.endStroke();
  };

  /** Bounding box between two corners, normalised so width/height are positive. */
  const shapeAt = (from: Point, to: Point): CanvasShapeItem => ({
    id: 'draft',
    type: 'shape',
    shape: shapeKind,
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    rotation: 0,
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
    stroke: color,
    strokeWidth,
    ...(shapeFilled ? { fill: color } : {}),
  });

  // Fill tool on an item: recolour a shape's fill or a text's colour.
  const handleFillItem = (id: string) => {
    const item = engine.items.find((candidate) => candidate.id === id);
    if (item?.type === 'shape' || item?.type === 'text') {
      engine.updateItem(id, { fill: color });
    }
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

  /**
   * Validates and persists the document. Returns true on success. Deliberately
   * does NOT notify the parent (onSaved): the parent reacts by unmounting the
   * editor, which would also drop the navigation blocker — so an exit that
   * follows a save must be triggered before the parent hears about it.
   */
  const persist = async (): Promise<boolean> => {
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

  // Picking a colour never paints by itself — with the fill tool the click on
  // the page or on a shape decides what gets the colour.
  const handleColorChange = (nextColor: string) => setColor(nextColor);

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

  /** Top-bar Save: persist, then let the page switch back to preview. */
  const handleSave = async () => {
    if (await persist()) {
      onSaved?.();
    }
  };

  /** Dialog "save and leave": persist, then continue the blocked exit. */
  const saveAndExit = async () => {
    if (await persist()) {
      performExit();
    }
  };

  return (
    <div className="flex w-full max-w-5xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onExit && (
            <Button type="button" variant="glass" size="sm" onClick={handleExit}>
              <ArrowLeft aria-hidden /> {t('common.action.back')}
            </Button>
          )}
          <h1 className="font-display text-2xl font-medium tracking-tight text-cream sm:text-3xl">
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
            onDeletePage: () =>
              setConfirmation({
                title: t('wishlist.pages.deleteConfirm'),
                description: t('wishlist.pages.deleteConfirmBody'),
                confirmLabel: t('wishlist.pages.delete'),
                onConfirm: engine.deletePage,
              }),
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
          strokeKind={strokeKind}
          onStrokeKindChange={setStrokeKind}
          shapeKind={shapeKind}
          onShapeKindChange={setShapeKind}
          shapeFilled={shapeFilled}
          onShapeFilledChange={setShapeFilled}
          pageBackground={engine.background}
          pagePattern={engine.pattern}
          onPagePatternChange={engine.setPagePattern}
          canUndo={engine.canUndo}
          canRedo={engine.canRedo}
          onUndo={engine.undo}
          onRedo={engine.redo}
          hasSelection={engine.selectedItemId !== null}
          onDeleteSelection={() => selectedItemId && removeItem(selectedItemId)}
          onClearAll={() =>
            setConfirmation({
              title: t('wishlist.editor.clearConfirm'),
              description: t('wishlist.editor.clearConfirmBody'),
              confirmLabel: t('wishlist.toolbar.clearAll'),
              onConfirm: engine.clearPage,
            })
          }
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
            tool === 'shape' && 'cursor-crosshair',
            tool === 'fill' && 'cursor-pointer',
          )}
        >
          {viewport.isMeasured && (
            <WishlistCanvas
              strokes={engine.strokes}
              liveStroke={engine.liveStroke}
              previewShape={shapeDraft}
              onFillItem={tool === 'fill' ? handleFillItem : undefined}
              items={engine.items}
              background={engine.background}
              pattern={engine.pattern}
              pageId={engine.pageId}
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
              onPointerUp={handlePointerUp}
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
      <ConfirmDialog pending={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}

export default WishlistEditor;
