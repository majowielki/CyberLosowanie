import { ReactNode, useState } from 'react';
import {
  ArrowBigRight,
  ChevronDown,
  Circle,
  Diamond,
  Eraser,
  FileX2,
  Heart,
  ImagePlus,
  MousePointer2,
  PaintBucket,
  Pen,
  Redo2,
  Shapes,
  Smile,
  Square,
  Star,
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
import { PAGE_PATTERNS, PEN_COLORS, STROKE_KINDS, STROKE_WIDTHS } from './canvasConstants';
import { PagePattern, ShapeKind, StrokeKind } from './canvasDocument';
import PagePatternPreview from './PagePatternPreview';
import StrokeKindPreview from './StrokeKindPreview';

export type EditorTool = 'select' | 'pen' | 'eraser' | 'text' | 'shape' | 'fill';

interface CanvasToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  color: string;
  onColorChange: (color: string) => void;
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
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDeleteSelection: () => void;
  onClearAll: () => void;
  onPickImage: () => void;
  onPickEmoji: () => void;
  isUploadingImage: boolean;
}

const TOOLS: Array<{ id: EditorTool; labelKey: TranslationKey; icon: typeof Pen }> = [
  { id: 'select', labelKey: 'wishlist.toolbar.select', icon: MousePointer2 },
  { id: 'pen', labelKey: 'wishlist.toolbar.pen', icon: Pen },
  { id: 'eraser', labelKey: 'wishlist.toolbar.eraser', icon: Eraser },
  { id: 'text', labelKey: 'wishlist.toolbar.text', icon: Type },
  { id: 'shape', labelKey: 'wishlist.toolbar.shape', icon: Shapes },
  { id: 'fill', labelKey: 'wishlist.toolbar.fill', icon: PaintBucket },
];

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
  side: 'right' | 'bottom';
  /** Panel body; `close` lets an option collapse the panel after selection. */
  children: (close: () => void) => ReactNode;
}

/**
 * Collapsible option group: a compact trigger showing the current value,
 * with the full palette in a popover beside the toolbar. Keeps the toolbar
 * short — only the tools and the three current values stay visible.
 */
function ToolbarFlyout({ label, trigger, side, children }: ToolbarFlyoutProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          className={cn(
            'relative flex h-9 w-12 items-center justify-center rounded-md hover:bg-gray-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
            open && 'bg-gray-200',
          )}
        >
          {trigger}
          {/* Corner mark: "there is more here" (flyout convention). */}
          <ChevronDown className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-gray-500" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-auto p-2">
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
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  onDeleteSelection,
  onClearAll,
  onPickImage,
  onPickEmoji,
  isUploadingImage,
}: CanvasToolbarProps) {
  const { t } = useTranslation();
  const showStrokeOptions = tool === 'pen' || tool === 'eraser' || tool === 'shape';
  const showColorOptions = tool === 'pen' || tool === 'text' || tool === 'shape' || tool === 'fill';
  const showKindOptions = tool === 'pen';
  const showShapeOptions = tool === 'shape';
  const showPatternOptions = tool === 'fill';
  const showContextualOptions =
    showColorOptions || showStrokeOptions || showKindOptions || showShapeOptions || showPatternOptions;
  const CurrentShapeIcon = SHAPE_OPTIONS.find((option) => option.id === shapeKind)?.icon ?? Square;
  const isCustomColor = !(PEN_COLORS as readonly string[]).includes(color);
  // Desktop: toolbar is a left column, so panels open to its right; on phones
  // the toolbar is a strip above the canvas and panels drop below it.
  const flyoutSide = useMediaQuery('(min-width: 768px)') ? 'right' : 'bottom';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 text-card-foreground shadow-elevated md:w-16 md:flex-col md:flex-nowrap">
      {/* Tools */}
      <div className="flex flex-wrap items-center gap-1.5 md:flex-col">
        {TOOLS.map(({ id, labelKey, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="icon"
            variant={tool === id ? 'default' : 'ghost'}
            title={t(labelKey)}
            aria-label={t(labelKey)}
            aria-pressed={tool === id}
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
          onClick={onPickEmoji}
        >
          <Smile />
        </Button>
      </div>

      {showContextualOptions && (
        <>
          <ToolbarDivider />
          {/* Contextual options collapse into one trigger each (showing the
              current value); the palette opens beside the toolbar. */}
          <div className="flex flex-wrap items-center gap-1.5 md:flex-col">
            {showKindOptions && (
              <ToolbarFlyout
                label={t('wishlist.toolbar.kindCurrent', { name: t(KIND_LABEL_KEYS[strokeKind]) })}
                side={flyoutSide}
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
                        value={color}
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
                label={t('wishlist.toolbar.patternCurrent', { name: t(PATTERN_LABEL_KEYS[pagePattern ?? 'none']) })}
                side={flyoutSide}
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

      <ToolbarDivider />

      {/* History & destructive actions */}
      <div className="flex flex-wrap items-center gap-1.5 md:flex-col">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('wishlist.toolbar.undo')}
          aria-label={t('wishlist.toolbar.undo')}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('wishlist.toolbar.redo')}
          aria-label={t('wishlist.toolbar.redo')}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title={t('wishlist.toolbar.deleteSelection')}
          aria-label={t('wishlist.toolbar.deleteSelection')}
          disabled={!hasSelection}
          onClick={onDeleteSelection}
        >
          <Trash2 />
        </Button>
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
      </div>
    </div>
  );
}

export default CanvasToolbar;
