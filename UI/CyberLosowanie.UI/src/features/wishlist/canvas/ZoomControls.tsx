import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/i18n';
import type { StageViewport } from './useStageViewport';

/**
 * Shared zoom strip (editor top bar and read-only viewer): out / percentage /
 * in / fit-to-width reset.
 */
function ZoomControls({ viewport }: { viewport: StageViewport }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-11 items-center gap-1 rounded-md bg-white/90 px-1 shadow">
      <Button type="button" size="icon" variant="ghost" title={t('wishlist.zoom.out')} aria-label={t('wishlist.zoom.out')}
        disabled={!viewport.canZoomOut} onClick={viewport.zoomOut}>
        <ZoomOut />
      </Button>
      <span className="w-12 text-center text-xs font-medium tabular-nums">
        {viewport.zoomPercentage}%
      </span>
      <Button type="button" size="icon" variant="ghost" title={t('wishlist.zoom.in')} aria-label={t('wishlist.zoom.in')}
        disabled={!viewport.canZoomIn} onClick={viewport.zoomIn}>
        <ZoomIn />
      </Button>
      <Button type="button" size="icon" variant="ghost" title={t('wishlist.zoom.fit')}
        aria-label={t('wishlist.zoom.fit')} onClick={viewport.resetView}>
        <Maximize />
      </Button>
    </div>
  );
}

export default ZoomControls;
