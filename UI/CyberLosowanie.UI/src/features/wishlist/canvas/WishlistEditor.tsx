import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useSelector } from 'react-redux';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Maximize, Save } from 'lucide-react';
import { RootState } from '@/app/store';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/hooks/use-toast';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { useHistoryBackTrap } from '@/shared/hooks/useHistoryBackTrap';
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
  DEFAULT_FILL_GAP,
  DEFAULT_PEN_COLOR,
  DOCUMENT_LIMITS,
  FILL_GAP_RADIUS,
  OPEN_BACKGROUND_SHARE,
  DEFAULT_SHAPE_SIZE,
  FillGapLevel,
  DEFAULT_STROKE_KIND,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_PLACEHOLDER,
  MOBILE_DEFAULT_FONT_SIZE,
  MOBILE_MIN_TEXT_WIDTH,
  MOBILE_TEXT_MARGIN,
  SHAPE_DRAG_THRESHOLD,
  TOOL_SHORTCUTS,
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
import { RasterImage, computeAreaFill } from './areaFill';
import CanvasToolbar, { EditorTool } from './CanvasToolbar';
import TextEditOverlay from './TextEditOverlay';
import MobileTextSheet, { MobileTextSheetHandle } from './MobileTextSheet';
import MobileEditorBar from './MobileEditorBar';
import { useCanvasEngine, ItemOrderMove, Point } from './useCanvasEngine';
import { useStageViewport } from './useStageViewport';
import WishlistCanvas from './WishlistCanvas';
import ZoomControls from './ZoomControls';
import PageCarousel from './PageCarousel';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import { STICKERS, StickerId } from './stickers';
import UnsavedChangesDialog from './UnsavedChangesDialog';
import ConfirmDialog, { PendingConfirmation } from './ConfirmDialog';
import { clearWishlistDraft, writeWishlistDraft } from './wishlistDraft';

// Eraser cursor preview is drawn in a neutral gray (it has no ink color).
const ERASER_CURSOR_COLOR = '#6b7280';

interface WishlistEditorProps {
  initialDocument: CanvasDocument;
  /** Shown as a back button when the page has a preview mode to return to. */
  onExit?: () => void;
  /** Called after a successful save (the page switches back to preview). */
  onSaved?: () => void;
  /** `initialDocument` is a local draft newer than the saved wishlist. */
  restoredDraft?: boolean;
}

// Debounce of the local draft write while editing.
const DRAFT_SAVE_DELAY_MS = 1000;

/**
 * The wishlist canvas editor (doc 5.3): toolbar + canvas + top bar with zoom
 * and save. Composes the isolated Konva pieces — document state in
 * useCanvasEngine, viewport in useStageViewport, rendering in WishlistCanvas.
 *
 * Below the md breakpoint it takes over the whole screen (over the navbar):
 * a slim top bar, the page fitted between the bars, the toolbar docked at the
 * bottom, text typed in a panel above the keyboard and the system Back
 * gesture handled in-app.
 */
function WishlistEditor({ initialDocument, onExit, onSaved, restoredDraft = false }: WishlistEditorProps) {
  const { t } = useTranslation();
  const compact = !useMediaQuery('(min-width: 768px)');
  const navigate = useNavigate();
  const location = useLocation();
  const engine = useCanvasEngine(initialDocument, { initiallyDirty: restoredDraft });
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
  const textSheetRef = useRef<MobileTextSheetHandle>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  // Set when the in-editor Back button is pressed with unsaved changes; router
  // navigation is caught separately by the blocker below.
  const [backRequested, setBackRequested] = useState(false);
  // Destructive actions (clear page, delete page) ask first, in-app.
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [fillGap, setFillGap] = useState<FillGapLevel>(DEFAULT_FILL_GAP);
  const drawingSnapshotRef = useRef<(() => RasterImage | null) | null>(null);
  // Held Space turns the primary button into a hand tool (pan) with any tool.
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  isSpaceHeldRef.current = isSpaceHeld;

  const viewport = useStageViewport({
    panEnabled: tool === 'select',
    isHandPanActive: () => isSpaceHeldRef.current,
    // A pinch that starts mid-stroke means the finger was zooming, not drawing.
    onPinchStart: engine.cancelStroke,
    fit: compact ? 'contain' : 'width',
  });

  const [saveMyWishlist, { isLoading: isSaving }] = useSaveMyWishlistMutation();
  const [uploadWishlistImage, { isLoading: isUploadingImage }] = useUploadWishlistImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);

  const { selectedItemId, removeItem, isDirty } = engine;

  // Set right before an exit the user already confirmed (discard / saved), so
  // the blocker lets that one navigation through.
  const leavingRef = useRef(false);

  // Catch in-app route navigation (e.g. Navbar links) while there are unsaved
  // changes, so the confirmation dialog below can offer save/discard.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !leavingRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Unsaved changes are mirrored to a local draft (debounced, and at once when
  // the tab is hidden — on phones that is often the last moment we get).
  const discardedRef = useRef(false);
  const { buildDocument } = engine;
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const writeDraft = () => {
      if (!discardedRef.current) {
        writeWishlistDraft(cyberekId, buildDocument());
      }
    };
    const timer = window.setTimeout(writeDraft, DRAFT_SAVE_DELAY_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        writeDraft();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty, buildDocument, cyberekId]);

  useEffect(() => {
    if (restoredDraft) {
      toast({
        title: t('wishlist.editor.draftRestored'),
        description: t('wishlist.editor.draftRestoredBody'),
      });
    }
    // Once per editor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full-screen phone editor: the page behind it must not scroll under the
  // fingers (rubber-banding, the address bar collapsing mid-stroke).
  useEffect(() => {
    if (!compact) {
      return;
    }
    const { style } = document.documentElement;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previousOverflow;
    };
  }, [compact]);

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

  // Keyboard shortcuts (shown in the toolbar tooltips). A ref to the latest
  // handler keeps one window listener for the editor's lifetime.
  const shortcutsBlocked =
    Boolean(editingTextId) || showEmojiPicker || showStickerPicker || confirmation !== null ||
    blocker.state === 'blocked' || backRequested;
  const handleShortcutRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  handleShortcutRef.current = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (shortcutsBlocked || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable) {
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    // Physical key codes, so layouts where ] / [ / Z sit elsewhere still work.
    if (mod && event.code === 'KeyZ') {
      event.preventDefault();
      if (event.shiftKey) {
        engine.redo();
      } else {
        engine.undo();
      }
    } else if (mod && event.code === 'KeyY') {
      event.preventDefault();
      engine.redo();
    } else if (mod && (event.code === 'BracketRight' || event.code === 'BracketLeft')) {
      if (selectedItemId) {
        event.preventDefault();
        const up = event.code === 'BracketRight';
        reorderSelection(event.shiftKey ? (up ? 'front' : 'back') : (up ? 'forward' : 'backward'));
      }
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedItemId) {
      event.preventDefault();
      removeItem(selectedItemId);
    } else if (event.key === 'Escape') {
      engine.setSelectedItemId(null);
    } else if (event.code === 'Space') {
      // Hold to pan; preventDefault stops the page from scrolling.
      event.preventDefault();
      if (!event.repeat) {
        setIsSpaceHeld(true);
      }
    } else if (!mod && !event.altKey && event.key.length === 1) {
      const picked = (Object.keys(TOOL_SHORTCUTS) as EditorTool[]).find(
        (candidate) => TOOL_SHORTCUTS[candidate] === event.key.toUpperCase(),
      );
      if (picked) {
        setTool(picked);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => handleShortcutRef.current(event);
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };
    // A Space released while the window is in the background never sends keyup.
    const handleBlur = () => setIsSpaceHeld(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // --- selection --------------------------------------------------------------

  const selectedItem = engine.items.find((item) => item.id === selectedItemId) ?? null;
  const selectedIndex = selectedItem ? engine.items.indexOf(selectedItem) : -1;
  // With the pointer tool, the palette recolours the selected text or shape.
  const recolorsSelection =
    tool === 'select' && (selectedItem?.type === 'text' || selectedItem?.type === 'shape');
  const paletteColor = !recolorsSelection
    ? color
    : selectedItem?.type === 'text'
      ? selectedItem.fill
      : selectedItem?.type === 'shape'
        ? selectedItem.stroke
        : color;

  const reorderSelection = (move: ItemOrderMove) => {
    if (selectedItemId) {
      engine.reorderItem(selectedItemId, move);
    }
  };

  // --- pointer routing per tool ----------------------------------------------

  const handlePointerDown = (position: Point, isBackground: boolean) => {
    if (viewport.isPinching() || viewport.isHandPanning()) {
      return;
    }
    if (tool === 'pen' || tool === 'eraser') {
      engine.beginStroke(tool, color, strokeWidth, position, strokeKind);
    } else if (tool === 'text' && isBackground) {
      // Phones: a readable size and a line spanning the rest of the page, so
      // a typed list wraps across the page instead of in a narrow column.
      const item = compact
        ? addMobileTextItem(position)
        : engine.addTextItem(position.x, position.y, color);
      openTextEditor(item.id);
      setTool('select');
    } else if (tool === 'shape') {
      shapeOriginRef.current = position;
      setShapeDraft(shapeAt(position, position));
    } else if (tool === 'fill' && isBackground) {
      fillAt(position);
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

  // A stroke or shape drag outlives the pointer leaving the canvas; it ends when
  // the button is released anywhere. Ending twice (canvas + window) is a no-op.
  const handlePointerUpRef = useRef(handlePointerUp);
  handlePointerUpRef.current = handlePointerUp;
  const isGesturing = engine.isDrawing || shapeDraft !== null;
  useEffect(() => {
    if (!isGesturing) {
      return;
    }
    const handleWindowPointerUp = () => handlePointerUpRef.current();
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [isGesturing]);

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

  /**
   * Fill tool on the page: flood the clicked region of the drawing. Open paper
   * (a large region reaching the page edge) recolours the page background as
   * before; anything enclosed — or a drawn line or an earlier fill — gets an
   * area fill.
   */
  const fillAt = (position: Point) => {
    const raster = engine.strokes.length > 0 ? drawingSnapshotRef.current?.() : null;
    if (!raster) {
      engine.setPageBackground(color);
      return;
    }
    const result = computeAreaFill(raster, position, {
      gapRadius: FILL_GAP_RADIUS[fillGap],
      maxPoints: DOCUMENT_LIMITS.maxPointsPerStroke,
      maxRings: DOCUMENT_LIMITS.maxFillRings,
    });
    if (!result) {
      toast({ title: t('wishlist.editor.fillTooComplex'), variant: 'destructive' });
      return;
    }
    const isOpenBackground =
      result.seedEmpty &&
      result.touchesBorder &&
      result.area >= OPEN_BACKGROUND_SHARE * CANVAS_WIDTH * CANVAS_HEIGHT;
    if (isOpenBackground) {
      engine.setPageBackground(color);
    } else {
      engine.addFill(color, result.rings);
    }
  };

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

  /**
   * Starts editing a text. On phones the panel is mounted synchronously and
   * focused right away, while still inside the tap or click that asked for it
   * — iOS ignores a focus() from an effect after the gesture and keeps the
   * keyboard closed.
   */
  const openTextEditor = (id: string) => {
    if (!compact) {
      setEditingTextId(id);
      return;
    }
    flushSync(() => setEditingTextId(id));
    textSheetRef.current?.focus();
  };

  const addMobileTextItem = (position: Point) => {
    const x = Math.min(position.x, CANVAS_WIDTH - MOBILE_TEXT_MARGIN - MOBILE_MIN_TEXT_WIDTH);
    return engine.addTextItem(x, position.y, color, {
      fontSize: MOBILE_DEFAULT_FONT_SIZE,
      width: CANVAS_WIDTH - MOBILE_TEXT_MARGIN - x,
    });
  };

  const handleTextCommit = (text: string, fontSize?: number) => {
    if (editingTextItem) {
      const trimmed = text.trim();
      if (!trimmed) {
        engine.removeItem(editingTextItem.id);
      } else if (trimmed !== editingTextItem.text || (fontSize && fontSize !== editingTextItem.fontSize)) {
        engine.updateItem(editingTextItem.id, { text: trimmed, ...(fontSize ? { fontSize } : {}) });
      }
    }
    setEditingTextId(null);
  };

  // Cancelling a text that was never typed into drops it — the default text is
  // only a placeholder and must not end up on the wishlist.
  const handleTextCancel = () => {
    if (editingTextItem?.text === DEFAULT_TEXT_PLACEHOLDER) {
      engine.removeItem(editingTextItem.id);
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
      clearWishlistDraft(cyberekId);
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
  // the page or on a shape decides what gets the colour. The exception is the
  // pointer tool with a text or shape selected: then the palette recolours it
  // (a filled shape keeps outline and fill in one colour, as when drawn), and
  // a drag through the colour picker is a single undo step.
  const handleColorChange = (nextColor: string) => {
    if (!recolorsSelection || !selectedItem) {
      setColor(nextColor);
      return;
    }
    const patch = selectedItem.type === 'text'
      ? { fill: nextColor }
      : { stroke: nextColor, ...(selectedItem.type === 'shape' && selectedItem.fill ? { fill: nextColor } : {}) };
    engine.updateItem(selectedItem.id, patch, `recolor:${selectedItem.id}`);
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

  const handleStickerSelect = (stickerId: StickerId) => {
    const { width, height } = STICKERS[stickerId];
    engine.addStickerItem(stickerId, width, height);
    setShowStickerPicker(false);
    setTool('select');
  };

  // --- leaving with unsaved changes ------------------------------------------

  const unsavedDialogOpen = blocker.state === 'blocked' || backRequested;

  // System Back on phones: close whatever is open first, then treat it like
  // the top bar's Back button.
  const handleSystemBack = () => {
    if (textSheetRef.current) {
      textSheetRef.current.commit();
    } else if (unsavedDialogOpen) {
      cancelExit();
    } else if (confirmation) {
      setConfirmation(null);
    } else if (showEmojiPicker) {
      setShowEmojiPicker(false);
    } else if (showStickerPicker) {
      setShowStickerPicker(false);
    } else if (document.querySelector('[data-radix-popper-content-wrapper]')) {
      // An open toolbar flyout or menu (Radix closes its layers on Escape).
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    } else {
      requestExit();
    }
  };
  const releaseBackTrap = useHistoryBackTrap(compact, handleSystemBack);

  /** Leaves the editor for real: back to the preview, or to the previous page. */
  const leave = () => {
    const trapOnTop = releaseBackTrap();
    if (onExit) {
      // Same route — the trap's history entry is popped when the editor unmounts.
      onExit();
      return;
    }
    leavingRef.current = true;
    if (location.key === 'default') {
      // Opened straight on /wishlist (e.g. from a link): nothing to go back to.
      navigate('/');
    } else if (trapOnTop) {
      window.history.go(-2);
    } else {
      navigate(-1);
    }
  };

  const requestExit = () => {
    if (engine.isDirty) {
      setBackRequested(true);
    } else {
      leave();
    }
  };

  const performExit = () => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      setBackRequested(false);
      leave();
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

  /** Dialog "discard": drop the local draft too, then continue the exit. */
  const discardAndExit = () => {
    discardedRef.current = true;
    clearWishlistDraft(cyberekId);
    performExit();
  };

  const pageEditing = {
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
  };

  const confirmClearPage = () =>
    setConfirmation({
      title: t('wishlist.editor.clearConfirm'),
      description: t('wishlist.editor.clearConfirmBody'),
      confirmLabel: t('wishlist.toolbar.clearAll'),
      onConfirm: engine.clearPage,
    });

  const toolbar = (
    <CanvasToolbar
      variant={compact ? 'dock' : 'panel'}
      tool={tool}
      onToolChange={setTool}
      color={paletteColor}
      onColorChange={handleColorChange}
      showSelectionColor={recolorsSelection}
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
      fillGap={fillGap}
      onFillGapChange={setFillGap}
      canUndo={engine.canUndo}
      canRedo={engine.canRedo}
      onUndo={engine.undo}
      onRedo={engine.redo}
      hasSelection={selectedItem !== null}
      canMoveSelectionForward={selectedIndex >= 0 && selectedIndex < engine.items.length - 1}
      canMoveSelectionBackward={selectedIndex > 0}
      onReorderSelection={reorderSelection}
      onDeleteSelection={() => selectedItemId && removeItem(selectedItemId)}
      onClearAll={confirmClearPage}
      onEditSelectedText={
        selectedItem?.type === 'text' ? () => openTextEditor(selectedItem.id) : undefined
      }
      onPickImage={() => fileInputRef.current?.click()}
      onPickEmoji={() => setShowEmojiPicker(true)}
      onPickSticker={() => setShowStickerPicker(true)}
      isUploadingImage={isUploadingImage}
    />
  );

  const canvasArea = (
    <div
      ref={viewport.containerRef}
      // The tap that created a text ends here — still inside the gesture, so
      // focusing now opens the iOS keyboard (see openTextEditor).
      onTouchEnd={compact ? () => textSheetRef.current?.focus() : undefined}
      className={cn(
        'relative touch-none overflow-hidden',
        compact
          // The page is fitted inside this box and centred in it.
          ? 'flex h-full w-full items-center justify-center'
          : 'flex-1 rounded-md shadow-lg',
        // Pen/eraser hide the native cursor — the on-canvas brush circle is the cursor.
        isSpaceHeld ? 'cursor-grab active:cursor-grabbing' : [
          (tool === 'pen' || tool === 'eraser') && 'cursor-none',
          tool === 'text' && 'cursor-text',
          tool === 'shape' && 'cursor-crosshair',
          tool === 'fill' && 'cursor-pointer',
        ],
      )}
    >
      {viewport.isMeasured && (
        <div className={cn(compact && 'overflow-hidden rounded-md shadow-lg')}>
          <WishlistCanvas
            strokes={engine.strokes}
            liveStroke={engine.liveStroke}
            previewShape={shapeDraft}
            onFillItem={tool === 'fill' ? handleFillItem : undefined}
            drawingSnapshotRef={drawingSnapshotRef}
            items={engine.items}
            background={engine.background}
            pattern={engine.pattern}
            pageId={engine.pageId}
            brushCursor={
              // No brush preview under a finger — it would only trail the stroke.
              !compact && (tool === 'pen' || tool === 'eraser')
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
            onTextEditRequest={openTextEditor}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        </div>
      )}
      {editingTextItem && !compact && (
        <TextEditOverlay
          item={editingTextItem}
          stageScale={viewport.stageScale}
          stagePosition={viewport.stagePosition}
          onCommit={handleTextCommit}
          onCancel={handleTextCancel}
        />
      )}
    </div>
  );

  const overlays = (
    <>
      {editingTextItem && compact && (
        <MobileTextSheet
          ref={textSheetRef}
          // A fresh panel per edited text (its draft state starts from the item).
          key={editingTextItem.id}
          item={editingTextItem}
          onCommit={handleTextCommit}
        />
      )}

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
      {showStickerPicker && (
        <StickerPicker onSelect={handleStickerSelect} onClose={() => setShowStickerPicker(false)} />
      )}

      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        isSaving={isSaving}
        onSave={saveAndExit}
        onDiscard={discardAndExit}
        onCancel={cancelExit}
      />
      <ConfirmDialog pending={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );

  if (compact) {
    return (
      // Covers the navbar (z-40) and footer; popovers and dialogs portal above.
      <div className="fixed inset-0 z-[45] flex h-[100dvh] flex-col bg-pine-950">
        <MobileEditorBar
          onBack={requestExit}
          onSave={handleSave}
          isSaving={isSaving}
          isDirty={engine.isDirty}
          pageCount={engine.pageCount}
          currentPageIndex={engine.currentPageIndex}
          onGoTo={engine.goToPage}
          pages={pageEditing}
          onClearPage={confirmClearPage}
          viewport={viewport}
        />
        <div className="relative min-h-0 flex-1 p-2">
          {canvasArea}
          {viewport.zoom > 1 && (
            // Zoomed in by pinch: one tap back to the whole page.
            <Button
              type="button"
              size="sm"
              variant="glass"
              className="absolute left-1/2 top-3 -translate-x-1/2 bg-pine-950/70 tabular-nums"
              aria-label={t('wishlist.zoom.fitScreen')}
              onClick={viewport.resetView}
            >
              {viewport.zoomPercentage}% <Maximize aria-hidden />
            </Button>
          )}
        </div>
        {toolbar}
        {overlays}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onExit && (
            <Button type="button" variant="glass" size="sm" onClick={requestExit}>
              <ArrowLeft aria-hidden /> {t('common.action.back')}
            </Button>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
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
          editing={pageEditing}
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        {toolbar}
        {canvasArea}
      </div>

      {overlays}
    </div>
  );
}

export default WishlistEditor;
