import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { StageViewport } from './useStageViewport';

/**
 * Shared zoom strip (editor top bar and read-only viewer): out / percentage /
 * in / fit-to-width reset.
 */
function ZoomControls({ viewport }: { viewport: StageViewport }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-white/90 p-1 shadow">
      <Button type="button" size="icon" variant="ghost" title="Oddal" aria-label="Oddal"
        disabled={!viewport.canZoomOut} onClick={viewport.zoomOut}>
        <ZoomOut />
      </Button>
      <span className="w-12 text-center text-xs font-medium tabular-nums">
        {viewport.zoomPercentage}%
      </span>
      <Button type="button" size="icon" variant="ghost" title="Przybliż" aria-label="Przybliż"
        disabled={!viewport.canZoomIn} onClick={viewport.zoomIn}>
        <ZoomIn />
      </Button>
      <Button type="button" size="icon" variant="ghost" title="Dopasuj do szerokości"
        aria-label="Dopasuj do szerokości" onClick={viewport.resetView}>
        <Maximize />
      </Button>
    </div>
  );
}

export default ZoomControls;
