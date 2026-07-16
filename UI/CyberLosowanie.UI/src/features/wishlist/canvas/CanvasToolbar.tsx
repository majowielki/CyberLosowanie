import { Eraser, ImagePlus, MousePointer2, Pen, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
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

const TOOLS: Array<{ id: EditorTool; label: string; icon: typeof Pen }> = [
  { id: 'select', label: 'Wskaźnik (zaznaczanie i przesuwanie)', icon: MousePointer2 },
  { id: 'pen', label: 'Pióro', icon: Pen },
  { id: 'eraser', label: 'Gumka (tylko rysunek)', icon: Eraser },
  { id: 'text', label: 'Tekst (kliknij na płótno)', icon: Type },
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
  const showStrokeOptions = tool === 'pen' || tool === 'eraser';
  const showColorOptions = tool === 'pen' || tool === 'text';

  return (
    <div className="flex md:flex-col flex-wrap items-center gap-2 rounded-md bg-white/90 p-2 shadow md:w-16">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="icon"
          variant={tool === id ? 'default' : 'ghost'}
          title={label}
          aria-label={label}
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
        title="Wstaw zdjęcie"
        aria-label="Wstaw zdjęcie"
        disabled={isUploadingImage}
        onClick={onPickImage}
      >
        <ImagePlus />
      </Button>

      <div className="h-px w-full bg-gray-200 max-md:hidden" />

      {showColorOptions && (
        <div className="grid grid-cols-5 md:grid-cols-2 gap-1" role="group" aria-label="Kolor">
          {PEN_COLORS.map((penColor) => (
            <button
              key={penColor}
              type="button"
              title={`Kolor ${penColor}`}
              aria-label={`Kolor ${penColor}`}
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
        <div className="flex md:flex-col gap-1" role="group" aria-label="Grubość linii">
          {STROKE_WIDTHS.map((width) => (
            <button
              key={width}
              type="button"
              title={`Grubość ${width}`}
              aria-label={`Grubość ${width}`}
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

      <Button type="button" size="icon" variant="ghost" title="Cofnij" aria-label="Cofnij"
        disabled={!canUndo} onClick={onUndo}>
        <Undo2 />
      </Button>
      <Button type="button" size="icon" variant="ghost" title="Ponów" aria-label="Ponów"
        disabled={!canRedo} onClick={onRedo}>
        <Redo2 />
      </Button>
      <Button type="button" size="icon" variant="ghost" title="Usuń zaznaczony element"
        aria-label="Usuń zaznaczony element" disabled={!hasSelection} onClick={onDeleteSelection}>
        <Trash2 />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs text-red-600 hover:text-red-700"
        onClick={onClearAll}
      >
        Wyczyść
      </Button>
    </div>
  );
}

export default CanvasToolbar;
