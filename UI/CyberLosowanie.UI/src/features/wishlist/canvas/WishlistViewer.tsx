import { useState } from 'react';
import { CanvasDocument } from './canvasDocument';
import { useStageViewport } from './useStageViewport';
import WishlistCanvas from './WishlistCanvas';
import ZoomControls from './ZoomControls';
import PageCarousel from './PageCarousel';

/**
 * Read-only wishlist renderer (my-wishlist preview and the gifted person's
 * page): the same WishlistCanvas as the editor, without edit handlers, with
 * zoom/pan and page navigation (carousel) active.
 */
function WishlistViewer({ document }: { document: CanvasDocument }) {
  const viewport = useStageViewport({ panEnabled: true });
  const [pageIndex, setPageIndex] = useState(0);

  const safeIndex = Math.min(Math.max(pageIndex, 0), document.pages.length - 1);
  const page = document.pages[safeIndex];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Empty slot keeps zoom controls on the right when there is one page. */}
        <div>
          <PageCarousel
            pageCount={document.pages.length}
            currentPageIndex={safeIndex}
            onGoTo={setPageIndex}
          />
        </div>
        <ZoomControls viewport={viewport} />
      </div>
      <div
        ref={viewport.containerRef}
        className="relative w-full touch-none overflow-hidden rounded-md shadow-lg"
      >
        {viewport.isMeasured && page && (
          <WishlistCanvas
            strokes={page.strokes}
            items={page.items}
            background={page.background}
            stageProps={viewport.stageProps}
          />
        )}
      </div>
    </div>
  );
}

export default WishlistViewer;
