import { Eraser, ImagePlus, MousePointer2, Pen, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { useTranslation, TranslationKey } from '@/shared/i18n';
import { PEN_COLORS, STROKE_WIDTHS } from './canvasConstants';

export type EditorTool = 'select' | 'pen' | 'eraser' | 'text' | 'image';

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
  isUploadingImage: boolean;
}

const TOOLS: Array<{ id: EditorTool; labelKey: TranslationKey; icon: typeof Pen }> = [
  { id: 'select', labelKey: 'wishlist.toolbar.select', icon: MousePointer2 },
  { id: 'pen', labelKey: 'wishlist.toolbar.pen', icon: Pen },
  { id: 'eraser', labelKey: 'wishlist.toolbar.eraser', icon: Eraser },
  { id: 'text', labelKey: 'wishlist.toolbar.text', icon: Type },
];

/**
 * Tool panel of the wishlist editor — left column on desktop, horizontal strip
 * above the canvas on mobile (layout modelled on the Konva Canvas Editor demo).
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
  isUploadingImage,
}: CanvasToolbarProps) {
  const { t } = useTranslation();
  const showStrokeOptions = tool === 'pen' || tool === 'eraser';
  const showColorOptions = tool === 'pen' || tool === 'text';

  return (
    <div className="flex md:flex-col flex-wrap items-center gap-2 rounded-md bg-white/90 p-2 shadow md:w-16">
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

      <div className="h-px w-full bg-gray-200 max-md:hidden" />

      {showColorOptions && (
        <div className="grid grid-cols-5 md:grid-cols-2 gap-1" role="group" aria-label={t('wishlist.toolbar.colorGroup')}>
          {PEN_COLORS.map((penColor) => (
            <button
              key={penColor}
              type="button"
              title={t('wishlist.toolbar.colorOption', { color: penColor })}
              aria-label={t('wishlist.toolbar.colorOption', { color: penColor })}
              aria-pressed={color === penColor}
              onClick={() => onColorChange(penColor)}
              className={cn(
                'h-5 w-5 rounded-full border border-gray-300',
                color === penColor && 'ring-2 ring-sky-500 ring-offset-1',
              )}
              style={{ backgroundColor: penColor }}
            />
          ))}
        </div>
      )}

      {showStrokeOptions && (
        <div className="flex md:flex-col gap-1" role="group" aria-label={t('wishlist.toolbar.strokeGroup')}>
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

      <div className="h-px w-full bg-gray-200 max-md:hidden" />

      <Button type="button" size="icon" variant="ghost" title={t('wishlist.toolbar.undo')} aria-label={t('wishlist.toolbar.undo')}
        disabled={!canUndo} onClick={onUndo}>
        <Undo2 />
      </Button>
      <Button type="button" size="icon" variant="ghost" title={t('wishlist.toolbar.redo')} aria-label={t('wishlist.toolbar.redo')}
        disabled={!canRedo} onClick={onRedo}>
        <Redo2 />
      </Button>
      <Button type="button" size="icon" variant="ghost" title={t('wishlist.toolbar.deleteSelection')}
        aria-label={t('wishlist.toolbar.deleteSelection')} disabled={!hasSelection} onClick={onDeleteSelection}>
        <Trash2 />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs text-red-600 hover:text-red-700"
        onClick={onClearAll}
      >
        {t('wishlist.toolbar.clearAll')}
      </Button>
    </div>
  );
}

export default CanvasToolbar;
