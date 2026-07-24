import { ChevronLeft, ChevronRight, Copy, FilePlus2, Trash } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';

/** Editing controls — present only in the editor, absent in the read-only viewer. */
export interface PageCarouselEditing {
  canAddPage: boolean;
  canDeletePage: boolean;
  onAddPage: () => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
}

interface PageCarouselProps {
  pageCount: number;
  currentPageIndex: number;
  onGoTo: (index: number) => void;
  editing?: PageCarouselEditing;
}

/**
 * Page navigation for the wishlist carousel: previous / indicator + dots / next,
 * plus add · duplicate · delete when editing. Shared by the editor and the
 * read-only viewer so both present pages the same way.
 */
function PageCarousel({ pageCount, currentPageIndex, onGoTo, editing }: PageCarouselProps) {
  const { t } = useTranslation();

  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < pageCount - 1;
  // A single page needs no navigation — hide the whole bar in the viewer.
  if (pageCount <= 1 && !editing) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-md bg-white/90 px-2 py-1 shadow">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        title={t('wishlist.pages.previous')}
        aria-label={t('wishlist.pages.previous')}
        disabled={!canGoPrev}
        onClick={() => onGoTo(currentPageIndex - 1)}
      >
        <ChevronLeft />
      </Button>

      <span className="text-xs font-medium tabular-nums">
        {t('wishlist.pages.indicator', { current: currentPageIndex + 1, total: pageCount })}
      </span>

      {/* Dots — jump straight to a page. */}
      <div className="flex items-center gap-1">
        {Array.from({ length: pageCount }, (_, index) => (
          <button
            key={index}
            type="button"
            title={t('wishlist.pages.goTo', { page: index + 1 })}
            aria-label={t('wishlist.pages.goTo', { page: index + 1 })}
            aria-current={index === currentPageIndex}
            onClick={() => onGoTo(index)}
            className={cn(
              'h-2.5 w-2.5 rounded-full border border-gray-400 transition-colors',
              index === currentPageIndex ? 'bg-green-700' : 'bg-transparent hover:bg-gray-300',
            )}
          />
        ))}
      </div>

      <Button
        type="button"
        size="icon"
        variant="ghost"
        title={t('wishlist.pages.next')}
        aria-label={t('wishlist.pages.next')}
        disabled={!canGoNext}
        onClick={() => onGoTo(currentPageIndex + 1)}
      >
        <ChevronRight />
      </Button>

      {editing && (
        <>
          <div className="h-6 w-px bg-gray-200" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t('wishlist.pages.add')}
            aria-label={t('wishlist.pages.add')}
            disabled={!editing.canAddPage}
            onClick={editing.onAddPage}
          >
            <FilePlus2 />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title={t('wishlist.pages.duplicate')}
            aria-label={t('wishlist.pages.duplicate')}
            disabled={!editing.canAddPage}
            onClick={editing.onDuplicatePage}
          >
            <Copy />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            title={t('wishlist.pages.delete')}
            aria-label={t('wishlist.pages.delete')}
            disabled={!editing.canDeletePage}
            onClick={editing.onDeletePage}
          >
            <Trash />
          </Button>
        </>
      )}
    </div>
  );
}

export default PageCarousel;
