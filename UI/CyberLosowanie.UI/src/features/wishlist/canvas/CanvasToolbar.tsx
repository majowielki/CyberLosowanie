import { ReactNode, useState } from 'react';
import {
  ArrowBigRight,
  ArrowDown,
  ArrowUp,
  BringToFront,
  ChevronDown,
  Circle,
  Diamond,
  Eraser,
  FileX2,
  Heart,
  ImagePlus,
  MousePointer2,
  Layers,
  PaintBucket,
  Pen,
  Redo2,
  SendToBack,
  Shapes,
  Smile,
  Square,
  Star,
  TextCursorInput,
  Trash2,
  Triangle,
  Type,
  Undo2,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { cn } from '@/shared/lib/utils';
import { useTranslation, TranslationKey } from '@/shared/i18n';
import {
  FILL_GAP_LEVELS,
  FillGapLevel,
  PAGE_PATTERNS,
  TOOL_SHORTCUTS,
  PEN_COLORS,
  STROKE_KINDS,
  STROKE_WIDTHS,
} from './canvasConstants';
import { PagePattern, ShapeKind, StrokeKind } from './canvasDocument';
import type { ItemOrderMove } from './useCanvasEngine';
import PagePatternPreview from './PagePatternPreview';
import StrokeKindPreview from './StrokeKindPreview';
import { vivid } from './strokeStyles';

export type EditorTool = keyof typeof TOOL_SHORTCUTS;

interface CanvasToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  /** Pointer tool with a recolourable item selected: show the palette for it. */
  showSelectionColor: boolean;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  strokeKind: StrokeKind;
  onStrokeKindChange: (kind: StrokeKind) => void;
  shapeKind: ShapeKind;
  onShapeKindChange: (kind: ShapeKind) => void;
  shapeFilled: boolean;
  onShapeFilledChange: (filled: boolean) => void;
  /** Current page's background colour and pattern (fill tool). */
  pageBackground: string;
  pagePattern: PagePattern | undefined;
  onPagePatternChange: (pattern: PagePattern | undefined) => void;
  fillGap: FillGapLevel;
  onFillGapChange: (level: FillGapLevel) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  /** Whether the selected item can still move up / down the z-order. */
  canMoveSelectionForward: boolean;
  canMoveSelectionBackward: boolean;
  onReorderSelection: (move: ItemOrderMove) => void;
  onDeleteSelection: () => void;
  onClearAll: () => void;
  onPickImage: () => void;
  onPickEmoji: () => void;
  isUploadingImage: boolean;
  /**
   * 'panel' (default): left column on desktop, wrapping strip on narrow
   * screens. 'dock': the full-screen phone editor's bottom bar — tools in one
   * thumb-sized row, options and history in a row above; page-level actions
   * (clear) live in the editor's top bar instead.
   */
  variant?: 'panel' | 'dock';
  /** Dock only: shown while a text is selected (double-tap is not discoverable). */
  onEditSelectedText?: () => void;
}

const TOOLS: Array<{ id: EditorTool; labelKey: TranslationKey; icon: typeof Pen }> = [
  { id: 'select', labelKey: 'wishlist.toolbar.select', icon: MousePointer2 },
  { id: 'pen', labelKey: 'wishlist.toolbar.pen', icon: Pen },
  { id: 'eraser', labelKey: 'wishlist.toolbar.eraser', icon: Eraser },
  { id: 'text', labelKey: 'wishlist.toolbar.text', icon: Type },
  { id: 'shape', labelKey: 'wishlist.toolbar.shape', icon: Shapes },
  { id: 'fill', labelKey: 'wishlist.toolbar.fill', icon: PaintBucket },
];

const ORDER_OPTIONS: Array<{ move: ItemOrderMove; labelKey: TranslationKey; icon: typeof Pen; shortcut: string }> = [
  { move: 'front', labelKey: 'wishlist.toolbar.order.front', icon: BringToFront, shortcut: 'Ctrl+Shift+]' },
  { move: 'forward', labelKey: 'wishlist.toolbar.order.forward', icon: ArrowUp, shortcut: 'Ctrl+]' },
  { move: 'backward', labelKey: 'wishlist.toolbar.order.backward', icon: ArrowDown, shortcut: 'Ctrl+[' },
  { move: 'back', labelKey: 'wishlist.toolbar.order.back', icon: SendToBack, shortcut: 'Ctrl+Shift+[' },
];

const FILL_GAP_LABEL_KEYS: Record<FillGapLevel, TranslationKey> = {
  none: 'wishlist.toolbar.fillGap.none',
  small: 'wishlist.toolbar.fillGap.small',
  large: 'wishlist.toolbar.fillGap.large',
};

const SHAPE_OPTIONS: Array<{ id: ShapeKind; labelKey: TranslationKey; icon: typeof Square }> = [
  { id: 'rect', labelKey: 'wishlist.toolbar.shape.rect', icon: Square },
  { id: 'ellipse', labelKey: 'wishlist.toolbar.shape.ellipse', icon: Circle },
  { id: 'triangle', labelKey: 'wishlist.toolbar.shape.triangle', icon: Triangle },
  { id: 'diamond', labelKey: 'wishlist.toolbar.shape.diamond', icon: Diamond },
  { id: 'star', labelKey: 'wishlist.toolbar.shape.star', icon: Star },
  { id: 'heart', labelKey: 'wishlist.toolbar.shape.heart', icon: Heart },
  { id: 'arrow', labelKey: 'wishlist.toolbar.shape.arrow', icon: ArrowBigRight },
];

const KIND_LABEL_KEYS: Record<StrokeKind, TranslationKey> = {
  pen: 'wishlist.toolbar.kind.pen',
  marker: 'wishlist.toolbar.kind.marker',
  highlighter: 'wishlist.toolbar.kind.highlighter',
  crayon: 'wishlist.toolbar.kind.crayon',
  glossy: 'wishlist.toolbar.kind.glossy',
  neon: 'wishlist.toolbar.kind.neon',
  glitter: 'wishlist.toolbar.kind.glitter',
};

const PATTERN_LABEL_KEYS: Record<PagePattern | 'none', TranslationKey> = {
  none: 'wishlist.toolbar.pattern.none',
  dots: 'wishlist.toolbar.pattern.dots',
  grid: 'wishlist.toolbar.pattern.grid',
  lines: 'wishlist.toolbar.pattern.lines',
  stripes: 'wishlist.toolbar.pattern.stripes',
  checker: 'wishlist.toolbar.pattern.checker',
  snowflakes: 'wishlist.toolbar.pattern.snowflakes',
  stars: 'wishlist.toolbar.pattern.stars',
  satin: 'wishlist.toolbar.pattern.satin',
  glossy: 'wishlist.toolbar.pattern.glossy',
  paper: 'wishlist.toolbar.pattern.paper',
};

// Divider between toolbar sections — a horizontal rule in the desktop column,
// a vertical rule in the mobile strip.
function ToolbarDivider() {
  return <div className="h-8 w-px shrink-0 bg-gray-200 md:h-px md:w-full" />;
}

interface ToolbarFlyoutProps {
  /** Accessible name of the trigger, naming the current value. */
  label: string;
  /** Preview of the current value shown on the trigger. */
  trigger: ReactNode;
  side: 'right' | 'bottom' | 'top';
  /** Bigger touch target for the phone dock. */
  large?: boolean;
  /** Panel body; `close` lets an option collapse the panel after selection. */
  children: (close: () => void) => ReactNode;
}

/**
 * Collapsible option group: a compact trigger showing the current value,
 * with the full palette in a popover beside the toolbar. Keeps the toolbar
 * short — only the tools and the three current values stay visible.
 */
function ToolbarFlyout({ label, trigger, side, large, children }: ToolbarFlyoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className={cn(
            'relative flex w-12 shrink-0 items-center justify-center rounded-md hover:bg-gray-100',
            large ? 'h-11' : 'h-9',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
            open && 'bg-gray-200',
          )}
        >
          {trigger}
          {/* Corner mark: "there is more here" (flyout convention). */}
          <ChevronDown className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-gray-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" collisionPadding={8} className="w-auto max-w-[calc(100vw-16px)] p-2">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Tool panel of the wishlist editor — left column on desktop, horizontal strip
 * above the canvas on mobile (layout modelled on the Konva Canvas Editor demo).
 * Grouped into: tools · contextual options (color/stroke) · history & destructive.
 */
function CanvasToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  showSelectionColor,
  strokeWidth,
  onStrokeWidthChange,
  strokeKind,
  onStrokeKindChange,
  shapeKind,
  onShapeKindChange,
  shapeFilled,
  onShapeFilledChange,
  pageBackground,
  pagePattern,
  onPagePatternChange,
  fillGap,
  onFillGapChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  canMoveSelectionForward,
  canMoveSelectionBackward,
  onReorderSelection,
  onDeleteSelection,
  onClearAll,
  onPickImage,
  onPickEmoji,
  isUploadingImage,
  variant = 'panel',
  onEditSelectedText,
}: CanvasToolbarProps) {
  const { t } = useTranslation();
  const withShortcut = (label: string, shortcut: string) =>
    t('wishlist.toolbar.withShortcut', { label, shortcut });
  const showStrokeOptions = tool === 'pen' || tool === 'eraser' || tool === 'shape';
  const showColorOptions =
    tool === 'pen' || tool === 'text' || tool === 'shape' || tool === 'fill' || showSelectionColor;
  const showKindOptions = tool === 'pen';
  const showShapeOptions = tool === 'shape';
  const showPatternOptions = tool === 'fill';
  const showContextualOptions =
    showColorOptions || showStrokeOptions || showKindOptions || showShapeOptions || showPatternOptions;
  const CurrentShapeIcon = SHAPE_OPTIONS.find((option) => option.id === shapeKind)?.icon ?? Square;
  const isCustomColor = !(PEN_COLORS as readonly string[]).includes(color);
  const dock = variant === 'dock';
  // Desktop: toolbar is a left column, so panels open to its right; on narrow
  // screens the panel is a strip above the canvas and panels drop below it;
  // the phone dock sits at the bottom, so its panels open upwards.
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const flyoutSide = dock ? 'top' : isDesktop ? 'right' : 'bottom';
  // Dock: 44px touch targets and 20px icons (the panel keeps the 36px desktop size).
  const toolButtonClass = dock ? 'h-11 w-full [&_svg]:size-5' : undefined;
  const actionButtonClass = dock ? 'h-11 w-11 shrink-0 [&_svg]:size-5' : undefined;

  return (
    <div
      className={cn(
        'text-card-foreground shadow-elevated',
        dock
          // Options + history on the first line, tools on the second (CSS order),
          // so the most used buttons sit closest to the thumb.
          ? 'flex flex-wrap items-center gap-1 rounded-t-2xl bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5'
          : 'flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 md:w-16 md:flex-col md:flex-nowrap',
      )}
    >
      {/* Tools */}
      <div className={dock ? 'order-2 grid w-full grid-cols-8 gap-0.5' : 'flex flex-wrap items-center gap-1.5 md:flex-col'}>
        {TOOLS.map(({ id, labelKey, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="icon"
            variant={tool === id ? 'default' : 'ghost'}
            title={withShortcut(t(labelKey), TOOL_SHORTCUTS[id])}
            aria-label={t(labelKey)}
            aria-keyshortcuts={TOOL_SHORTCUTS[id]}
            aria-pressed={tool === id}
            className={toolButtonClass}
            onClick={() => onToolChange(id)}
          >
            <Icon />
          </Button>
        ))}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('wishlist.toolbar.insertImage')}
          aria-label={t('wishlist.toolbar.insertImage')}
          disabled={isUploadingImage}
          className={toolButtonClass}
          onClick={onPickImage}
        >
          <ImagePlus />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('wishlist.toolbar.insertEmoji')}
          aria-label={t('wishlist.toolbar.insertEmoji')}
          className={toolButtonClass}
          onClick={onPickEmoji}
        >
          <Smile />
        </Button>
      </div>

      {showContextualOptions && (
        <>
          {!dock && <ToolbarDivider />}
          {/* Contextual options collapse into one trigger each (showing the
              current value); the palette opens beside the toolbar. */}
          <div className={dock ? 'order-1 flex items-center gap-0.5' : 'flex flex-wrap items-center gap-1.5 md:flex-col'}>
            {showKindOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.kindCurrent', { name: t(KIND_LABEL_KEYS[strokeKind]) })}
                side={flyoutSide}
                large={dock}
                trigger={<StrokeKindPreview kind={strokeKind} color={color} />}
              >
                {(close) => (
                  <div className="grid grid-cols-4 gap-1" role="group" aria-label={t('wishlist.toolbar.kindGroup')}>
                    {STROKE_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={strokeKind === kind}
                        onClick={() => {
                          onStrokeKindChange(kind);
                          close();
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 hover:bg-gray-100',
                          strokeKind === kind && 'bg-gray-200 text-gray-900 ring-1 ring-sky-500',
                        )}
                      >
                        <StrokeKindPreview kind={kind} color={color} />
                        {t(KIND_LABEL_KEYS[kind])}
                      </button>
                    ))}
                  </div>
                )}
              </ToolbarFlyout>
            )}

            {showShapeOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.shapeCurrent', {
                  name: t(SHAPE_OPTIONS.find((option) => option.id === shapeKind)?.labelKey ?? 'wishlist.toolbar.shape.rect'),
                })}
                side={flyoutSide}
                large={dock}
                trigger={
                  <CurrentShapeIcon
                    className="h-6 w-6"
                    style={{ color, fill: shapeFilled ? color : 'none' }}
                    aria-hidden
                  />
                }
              >
                {(close) => (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-4 gap-1" role="group" aria-label={t('wishlist.toolbar.shapeGroup')}>
                      {SHAPE_OPTIONS.map(({ id, labelKey, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={shapeKind === id}
                          onClick={() => {
                            onShapeKindChange(id);
                            close();
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 hover:bg-gray-100',
                            shapeKind === id && 'bg-gray-200 text-gray-900 ring-1 ring-sky-500',
                          )}
                        >
                          <Icon className="h-6 w-6" style={{ color, fill: shapeFilled ? color : 'none' }} aria-hidden />
                          {t(labelKey)}
                        </button>
                      ))}
                    </div>
                    {/* Outline vs. filled — applies to the next shape drawn. */}
                    <div className="grid grid-cols-2 gap-1 border-t border-gray-200 pt-2" role="group">
                      {([false, true] as const).map((filled) => (
                        <button
                          key={String(filled)}
                          type="button"
                          aria-pressed={shapeFilled === filled}
                          onClick={() => onShapeFilledChange(filled)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100',
                            shapeFilled === filled && 'bg-gray-200 text-gray-900 ring-1 ring-sky-500',
                          )}
                        >
                          <Square className="h-4 w-4" style={{ color, fill: filled ? color : 'none' }} aria-hidden />
                          {t(filled ? 'wishlist.toolbar.shapeFilled' : 'wishlist.toolbar.shapeOutline')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ToolbarFlyout>
            )}

            {showColorOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.colorCurrent', { color })}
                side={flyoutSide}
                large={dock}
                trigger={
                  // Rainbow ring around the current colour — reads as "palette",
                  // not as a stroke-width dot.
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full"
                    style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)' }}
                  >
                    <span
                      className="block h-[18px] w-[18px] rounded-full border-2 border-white"
                      style={{ backgroundColor: color }}
                    />
                  </span>
                }
              >
                {(close) => (
                  <div className="grid grid-cols-6 gap-2" role="group" aria-label={t('wishlist.toolbar.colorGroup')}>
                    {PEN_COLORS.map((penColor) => (
                      <button
                        key={penColor}
                        type="button"
                        title={t('wishlist.toolbar.colorOption', { color: penColor })}
                        aria-label={t('wishlist.toolbar.colorOption', { color: penColor })}
                        aria-pressed={color === penColor}
                        onClick={() => {
                          onColorChange(penColor);
                          close();
                        }}
                        className={cn(
                          'h-7 w-7 rounded-full border border-gray-300 transition-transform hover:scale-110',
                          color === penColor && 'ring-2 ring-sky-500 ring-offset-1',
                        )}
                        style={{ backgroundColor: penColor }}
                      />
                    ))}
                    {/* Any colour: the native picker (zero dependencies, works on
                        phones) yields #rrggbb — the exact format the document
                        schema validates. The swatch shows the picked colour, or a
                        rainbow ring while a preset is active. */}
                    <label
                      title={t('wishlist.toolbar.customColor')}
                      className={cn(
                        'relative h-7 w-7 cursor-pointer rounded-full border border-gray-300 transition-transform hover:scale-110',
                        isCustomColor && 'ring-2 ring-sky-500 ring-offset-1',
                      )}
                      style={
                        isCustomColor
                          ? { backgroundColor: color }
                          : { background: 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)' }
                      }
                    >
                      <input
                        type="color"
                        // A preset opens the picker on its vivid twin, so dragging
                        // the hue shows colours even when black is selected.
                        value={isCustomColor ? color : vivid(color)}
                        aria-label={t('wishlist.toolbar.customColor')}
                        onChange={(event) => onColorChange(event.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                )}
              </ToolbarFlyout>
            )}

            {showStrokeOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.strokeCurrent', { width: strokeWidth })}
                side={flyoutSide}
                large={dock}
                trigger={
                  <span
                    className="block rounded-full bg-gray-800"
                    style={{ width: Math.min(strokeWidth, 20), height: Math.min(strokeWidth, 20) }}
                  />
                }
              >
                {(close) => (
                  <div className="flex items-center gap-1" role="group" aria-label={t('wishlist.toolbar.strokeGroup')}>
                    {STROKE_WIDTHS.map((width) => (
                      <button
                        key={width}
                        type="button"
                        title={t('wishlist.toolbar.strokeOption', { width })}
                        aria-label={t('wishlist.toolbar.strokeOption', { width })}
                        aria-pressed={strokeWidth === width}
                        onClick={() => {
                          onStrokeWidthChange(width);
                          close();
                        }}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100',
                          strokeWidth === width && 'bg-gray-200 ring-1 ring-sky-500',
                        )}
                      >
                        {/* Dot preview of the stroke width, capped to fit the button. */}
                        <span
                          className="rounded-full bg-gray-800"
                          style={{ width: Math.min(width, 24), height: Math.min(width, 24) }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </ToolbarFlyout>
            )}

            {showPatternOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.fillGap', { name: t(FILL_GAP_LABEL_KEYS[fillGap]) })}
                side={flyoutSide}
                large={dock}
                trigger={<FillGapPreview level={fillGap} />}
              >
                {(close) => (
                  <div className="flex w-56 flex-col gap-2">
                    <p className="text-xs text-gray-600">{t('wishlist.toolbar.fillGapHint')}</p>
                    <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('wishlist.toolbar.fillGapGroup')}>
                      {FILL_GAP_LEVELS.map((level) => (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={fillGap === level}
                          onClick={() => {
                            onFillGapChange(level);
                            close();
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 hover:bg-gray-100',
                            fillGap === level && 'bg-gray-200 text-gray-900 ring-1 ring-sky-500',
                          )}
                        >
                          <FillGapPreview level={level} />
                          {t(FILL_GAP_LABEL_KEYS[level])}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ToolbarFlyout>
            )}

            {showPatternOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.patternCurrent', { name: t(PATTERN_LABEL_KEYS[pagePattern ?? 'none']) })}
                side={flyoutSide}
                large={dock}
                trigger={<PagePatternPreview pattern={pagePattern} background={pageBackground} />}
              >
                {(close) => (
                  <div className="grid grid-cols-4 gap-1" role="group" aria-label={t('wishlist.toolbar.patternGroup')}>
                    {(['none', ...PAGE_PATTERNS] as const).map((option) => {
                      const value = option === 'none' ? undefined : option;
                      const active = (pagePattern ?? 'none') === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            onPagePatternChange(value);
                            close();
                          }}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 hover:bg-gray-100',
                            active && 'bg-gray-200 text-gray-900 ring-1 ring-sky-500',
                          )}
                        >
                          <PagePatternPreview pattern={value} background={pageBackground} />
                          {t(PATTERN_LABEL_KEYS[option])}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ToolbarFlyout>
            )}
          </div>
        </>
      )}

      {!dock && <ToolbarDivider />}

      {/* History & destructive actions */}
      <div className={dock ? 'order-1 ml-auto flex items-center gap-0.5' : 'flex flex-wrap items-center gap-1.5 md:flex-col'}>
        {dock && hasSelection && onEditSelectedText && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t('wishlist.text.edit')}
            aria-label={t('wishlist.text.edit')}
            className={actionButtonClass}
            onClick={onEditSelectedText}
          >
            <TextCursorInput />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={withShortcut(t('wishlist.toolbar.undo'), 'Ctrl+Z')}
          aria-keyshortcuts="Control+Z"
          aria-label={t('wishlist.toolbar.undo')}
          disabled={!canUndo}
          className={actionButtonClass}
          onClick={onUndo}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={withShortcut(t('wishlist.toolbar.redo'), 'Ctrl+Y')}
          aria-keyshortcuts="Control+Y Control+Shift+Z"
          aria-label={t('wishlist.toolbar.redo')}
          disabled={!canRedo}
          className={actionButtonClass}
          onClick={onRedo}
        >
          <Redo2 />
        </Button>
        {hasSelection && (
          <ToolbarFlyout label={t('wishlist.toolbar.order')} side={flyoutSide} large={dock} trigger={<Layers className="h-5 w-5" aria-hidden />}>
            {(close) => (
              <div className="flex flex-col gap-0.5" role="group" aria-label={t('wishlist.toolbar.orderGroup')}>
                {ORDER_OPTIONS.map(({ move, labelKey, icon: Icon, shortcut }) => {
                  const enabled = move === 'front' || move === 'forward' ? canMoveSelectionForward : canMoveSelectionBackward;
                  return (
                    <button
                      key={move}
                      type="button"
                      disabled={!enabled}
                      onClick={() => {
                        onReorderSelection(move);
                        close();
                      }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="flex-1">{t(labelKey)}</span>
                      <kbd className="font-sans text-[0.65rem] text-gray-400">{shortcut}</kbd>
                    </button>
                  );
                })}
              </div>
            )}
          </ToolbarFlyout>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={withShortcut(t('wishlist.toolbar.deleteSelection'), 'Del')}
          aria-keyshortcuts="Delete"
          aria-label={t('wishlist.toolbar.deleteSelection')}
          disabled={!hasSelection}
          className={actionButtonClass}
          onClick={onDeleteSelection}
        >
          <Trash2 />
        </Button>
        {!dock && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            title={t('wishlist.toolbar.clearAll')}
            aria-label={t('wishlist.toolbar.clearAll')}
            onClick={onClearAll}
          >
            <FileX2 />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Trigger/option preview for gap closing: an outline with a break of that size. */
function FillGapPreview({ level }: { level: FillGapLevel }) {
  // Wider break = more closing; "none" shows a closed, unfilled ring.
  const gap = level === 'none' ? 0 : level === 'small' ? 4 : 9;
  const circumference = 2 * Math.PI * 8;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={level === 'none' ? 'none' : '#7dd3fc'}
        stroke="#1f2937"
        strokeWidth="2"
        strokeDasharray={gap ? `${circumference - gap} ${gap}` : undefined}
        transform="rotate(-60 12 12)"
      />
    </svg>
  );
}

export default CanvasToolbar;
