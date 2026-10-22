import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { toast } from '@/shared/hooks/use-toast';
import { useTranslation } from '@/shared/i18n';
import { debugLog } from '@/shared/config';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './canvasConstants';
import { CanvasDocument, CanvasPage } from './canvasDocument';
import WishlistCanvas, { CanvasExportHandle } from './WishlistCanvas';
import type { StageViewport } from './useStageViewport';

// Exported pages are rendered at twice the document resolution (2160×3056) —
// sharp on a phone screen and in print.
const EXPORT_PIXEL_RATIO = 2;
// Images come through the authorized proxy; one that never loads must not
// block the export forever — the page is captured with its placeholder.
const IMAGE_WAIT_MS = 8000;
const READY_POLL_MS = 100;
// The page is 1080×1528, i.e. A4 proportions (1:1.414), so a PDF page is A4.
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

const noop = () => {};
// Document-sized, unzoomed and inert — nobody interacts with the offscreen copy.
const FIXED_STAGE: StageViewport['stageProps'] = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  scaleX: 1,
  scaleY: 1,
  x: 0,
  y: 0,
  draggable: false,
  dragBoundFunc: (position) => position,
  onWheel: noop,
  onTouchMove: noop,
  onTouchEnd: noop,
  onDragEnd: noop,
};

type ExportFormat = 'pdf' | 'png';

interface ExportJob {
  format: ExportFormat;
  pageIndexes: number[];
  captured: string[];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/** ASCII file name: Polish letters folded ("Michał" → "michal"), everything else dashed. */
function toFileName(value: string): string {
  return value
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = window.document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

async function savePdf(pages: string[], fileName: string) {
  // Loaded on demand — jsPDF is only needed by people who actually download.
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  pages.forEach((dataUrl, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'portrait');
    }
    pdf.addImage(dataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  });
  pdf.save(fileName);
}

interface OffscreenPageCaptureProps {
  page: CanvasPage;
  format: ExportFormat;
  onCaptured: (dataUrl: string) => void;
  onFailed: (error: unknown) => void;
}

/**
 * Renders one page off screen at document size with the shared renderer, waits
 * for fonts and image bitmaps, then captures it.
 */
function OffscreenPageCapture({ page, format, onCaptured, onFailed }: OffscreenPageCaptureProps) {
  const handleRef = useRef<CanvasExportHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const capture = async () => {
      await window.document.fonts?.ready;
      const deadline = Date.now() + IMAGE_WAIT_MS;
      while (!cancelled && !handleRef.current?.isReady() && Date.now() < deadline) {
        await wait(READY_POLL_MS);
      }
      // Let Konva flush the redraw triggered by the last loaded image.
      await nextFrame();
      await nextFrame();
      if (cancelled || !handleRef.current) {
        return;
      }
      onCaptured(
        handleRef.current.toDataURL({
          pixelRatio: EXPORT_PIXEL_RATIO,
          // JPEG keeps a 10-page PDF small; a single PNG stays lossless.
          mimeType: format === 'pdf' ? 'image/jpeg' : 'image/png',
          quality: 0.92,
        }),
      );
    };
    capture().catch((error) => {
      if (!cancelled) {
        onFailed(error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [format, onCaptured, onFailed]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0"
      style={{ left: -100000, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      <WishlistCanvas
        strokes={page.strokes}
        items={page.items}
        background={page.background}
        pattern={page.pattern}
        pageId={page.id}
        stageProps={FIXED_STAGE}
        exportHandleRef={handleRef}
      />
    </div>
  );
}

interface WishlistDownloadButtonProps {
  document: CanvasDocument;
  currentPageIndex: number;
  /** Owner's name for the file name ("lista-zyczen-ola.pdf"). */
  ownerName?: string;
}

/**
 * "Download" menu of the read-only viewer: the whole letter as a PDF (one A4
 * page per wishlist page) or the current page as a PNG. Everything happens in
 * the browser — images are already same-origin blobs, so the canvas is clean.
 */
function WishlistDownloadButton({ document, currentPageIndex, ownerName }: WishlistDownloadButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<ExportJob | null>(null);

  const baseName = toFileName(t('wishlist.export.fileName', { name: ownerName ?? '' })) || 'wishlist';

  const start = (format: ExportFormat) => {
    setOpen(false);
    setJob({
      format,
      pageIndexes: format === 'pdf' ? document.pages.map((_, index) => index) : [currentPageIndex],
      captured: [],
    });
  };

  const handleCaptured = useCallback((dataUrl: string) => {
    setJob((current) => (current ? { ...current, captured: [...current.captured, dataUrl] } : current));
  }, []);

  const handleFailed = useCallback(
    (error: unknown) => {
      debugLog('Wishlist export failed:', error);
      setJob(null);
      toast({ variant: 'destructive', description: t('wishlist.export.failed') });
    },
    [t],
  );

  // All pages captured → assemble the file once, outside the state updater.
  useEffect(() => {
    if (!job || job.captured.length < job.pageIndexes.length) {
      return;
    }
    const finished = job;
    setJob(null);
    (async () => {
      if (finished.format === 'pdf') {
        await savePdf(finished.captured, `${baseName}.pdf`);
      } else {
        const pageName = t('wishlist.export.pageFileName', {
          base: baseName,
          page: String(finished.pageIndexes[0] + 1),
        });
        downloadDataUrl(finished.captured[0], `${pageName}.png`);
      }
    })().catch(handleFailed);
  }, [job, baseName, t, handleFailed]);

  const pendingIndex = job ? job.pageIndexes[job.captured.length] : undefined;
  const pendingPage = pendingIndex !== undefined ? document.pages[pendingIndex] : undefined;
  const isExporting = job !== null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="glass"
            className="h-11"
            disabled={isExporting}
            aria-label={isExporting ? t('wishlist.export.inProgress') : t('wishlist.export.download')}
          >
            {isExporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            <span className="hidden sm:inline">
              {isExporting ? t('wishlist.export.inProgress') : t('wishlist.export.download')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" collisionPadding={8} className="w-64 p-1.5">
          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
            onClick={() => start('pdf')}
          >
            <FileText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t('wishlist.export.pdf')}</span>
              <span className="text-xs text-muted-foreground">{t('wishlist.export.pdfHint')}</span>
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
            onClick={() => start('png')}
          >
            <FileImage className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{t('wishlist.export.png')}</span>
              <span className="text-xs text-muted-foreground">{t('wishlist.export.pngHint')}</span>
            </span>
          </button>
        </PopoverContent>
      </Popover>
      {job && pendingPage && (
        <OffscreenPageCapture
          key={`${job.format}-${pendingIndex}`}
          page={pendingPage}
          format={job.format}
          onCaptured={handleCaptured}
          onFailed={handleFailed}
        />
      )}
    </>
  );
}

export default WishlistDownloadButton;
