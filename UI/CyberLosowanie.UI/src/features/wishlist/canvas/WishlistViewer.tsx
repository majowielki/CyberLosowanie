import { CanvasDocument } from './canvasDocument';
import { useStageViewport } from './useStageViewport';
import WishlistCanvas from './WishlistCanvas';
import ZoomControls from './ZoomControls';

/**
 * Read-only wishlist renderer (my-wishlist preview and the gifted person's
 * page): the same WishlistCanvas as the editor, without edit handlers, with
 * zoom and pan still active.
 */
function WishlistViewer({ document }: { document: CanvasDocument }) {
  const viewport = useStageViewport({ panEnabled: true });

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex justify-end">
        <ZoomControls viewport={viewport} />
      </div>
      <div
        ref={viewport.containerRef}
        className="relative w-full touch-none overflow-hidden rounded-md shadow-lg"
      >
        {viewport.isMeasured && (
          <WishlistCanvas
            strokes={document.strokes}
            items={document.items}
            stageProps={viewport.stageProps}
          />
        )}
      </div>
    </div>
  );
}

export default WishlistViewer;
