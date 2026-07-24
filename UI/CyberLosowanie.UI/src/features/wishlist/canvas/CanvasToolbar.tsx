import {
  Eraser,
  FileX2,
  ImagePlus,
  MousePointer2,
  PaintBucket,
  Pen,
  Redo2,
  Smile,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { useTranslation, TranslationKey } from '@/shared/i18n';
import { PEN_COLORS, STROKE_WIDTHS } from './canvasConstants';

export type EditorTool = 'select' | 'pen' | 'eraser' | 'text' | 'fill';

interface CanvasToolbarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
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
  { id: 'fill', labelKey: 'wishlist.toolbar.fill', icon: PaintBucket },
];

// Divider between toolbar sections — a horizontal rule in the desktop column,
// a vertical rule in the mobile strip.
function ToolbarDivider() {
  return <div className="h-8 w-px shrink-0 bg-gray-200 md:h-px md:w-full" />;
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
  const showStrokeOptions = tool === 'pen' || tool === 'eraser';
  const showColorOptions = tool === 'pen' || tool === 'text' || tool === 'fill';
  const showContextualOptions = showColorOptions || showStrokeOptions;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 shadow-lg md:w-16 md:flex-col md:flex-nowrap">
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
          <div className="flex flex-wrap items-center gap-2 md:flex-col">
            {showColorOptions && (
              <div
                className="grid grid-cols-5 gap-1 md:grid-cols-2"
                role="group"
                aria-label={t('wishlist.toolbar.colorGroup')}
              >
                {PEN_COLORS.map((penColor) => (
                  <button
                    key={penColor}
                    type="button"
                    title={t('wishlist.toolbar.colorOption', { color: penColor })}
                    aria-label={t('wishlist.toolbar.colorOption', { color: penColor })}
                    aria-pressed={color === penColor}
                    onClick={() => onColorChange(penColor)}
                    className={cn(
                      'h-5 w-5 rounded-full border border-gray-300 transition-transform hover:scale-110',
                      color === penColor && 'ring-2 ring-sky-500 ring-offset-1',
                    )}
                    style={{ backgroundColor: penColor }}
                  />
                ))}
              </div>
            )}

            {showStrokeOptions && (
              <div
                className="flex items-center gap-1 md:flex-col"
                role="group"
                aria-label={t('wishlist.toolbar.strokeGroup')}
              >
                {STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    type="button"
                    title={t('wishlist.toolbar.strokeOption', { width })}
                    aria-label={t('wishlist.toolbar.strokeOption', { width })}
                    aria-pressed={strokeWidth === width}
                    onClick={() => onStrokeWidthChange(width)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100',
                      strokeWidth === width && 'bg-gray-200',
                    )}
                  >
                    {/* Dot preview of the stroke width, capped to fit the button. */}
                    <span
                      className="rounded-full bg-gray-800"
                      style={{ width: Math.min(width, 20), height: Math.min(width, 20) }}
                    />
                  </button>
                ))}
              </div>
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
