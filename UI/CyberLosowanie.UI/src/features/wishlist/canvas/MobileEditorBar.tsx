import { ReactNode, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus2,
  FileX2,
  Loader2,
  Maximize,
  MoreHorizontal,
  Save,
  Trash,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';
import type { PageCarouselEditing } from './PageCarousel';
import type { StageViewport } from './useStageViewport';

interface MobileEditorBarProps {
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
  isDirty: boolean;
  pageCount: number;
  currentPageIndex: number;
  onGoTo: (index: number) => void;
  pages: PageCarouselEditing;
  onClearPage: () => void;
  viewport: StageViewport;
}

/**
 * Top bar of the full-screen phone editor, replacing the app navbar, the page
 * title, the zoom strip and the page carousel: Back · page switcher · "more"
 * menu (page actions, zoom) · Save. Everything fits one 56px row at 360px.
 */
function MobileEditorBar({
  onBack,
  onSave,
  isSaving,
  isDirty,
  pageCount,
  currentPageIndex,
  onGoTo,
  pages,
  onClearPage,
  viewport,
}: MobileEditorBarProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const runAndClose = (action: () => void) => () => {
    action();
    setMenuOpen(false);
  };

  return (
    // Equal side columns keep the page switcher centred on the screen.
    <div className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1.5 border-b border-white/10 bg-pine-950/80 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="glass"
          className="h-11 w-11 shrink-0 [&_svg]:size-5"
          title={t('common.action.back')}
          aria-label={t('common.action.back')}
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="glass"
              className={cn('h-11 w-11 shrink-0 [&_svg]:size-5', menuOpen && 'bg-white/20')}
              title={t('wishlist.mobile.more')}
              aria-label={t('wishlist.mobile.more')}
            >
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" collisionPadding={8} className="w-64 p-1.5">
            <MenuItem icon={<FilePlus2 />} disabled={!pages.canAddPage} onClick={runAndClose(pages.onAddPage)}>
              {t('wishlist.pages.add')}
            </MenuItem>
            <MenuItem icon={<Copy />} disabled={!pages.canAddPage} onClick={runAndClose(pages.onDuplicatePage)}>
              {t('wishlist.pages.duplicate')}
            </MenuItem>
            <MenuItem icon={<Trash />} danger disabled={!pages.canDeletePage} onClick={runAndClose(pages.onDeletePage)}>
              {t('wishlist.pages.delete')}
            </MenuItem>
            <MenuItem icon={<FileX2 />} danger onClick={runAndClose(onClearPage)}>
              {t('wishlist.toolbar.clearAll')}
            </MenuItem>
            <div className="my-1.5 h-px bg-gray-200" />
            {/* Pinch zooms too; the buttons are the one-handed way. The menu
                stays open so the effect can be seen and repeated. */}
            <div className="flex items-center gap-1 px-1" role="group" aria-label={t('wishlist.mobile.zoomGroup')}>
              <Button type="button" size="icon" variant="ghost" className="h-11 w-11 [&_svg]:size-5"
                title={t('wishlist.zoom.out')} aria-label={t('wishlist.zoom.out')}
                disabled={!viewport.canZoomOut} onClick={viewport.zoomOut}>
                <ZoomOut />
              </Button>
              <span className="flex-1 text-center text-sm font-medium tabular-nums">{viewport.zoomPercentage}%</span>
              <Button type="button" size="icon" variant="ghost" className="h-11 w-11 [&_svg]:size-5"
                title={t('wishlist.zoom.in')} aria-label={t('wishlist.zoom.in')}
                disabled={!viewport.canZoomIn} onClick={viewport.zoomIn}>
                <ZoomIn />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-11 w-11 [&_svg]:size-5"
                title={t('wishlist.zoom.fitScreen')} aria-label={t('wishlist.zoom.fitScreen')}
                onClick={viewport.resetView}>
                <Maximize />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-center">
        <div className="flex items-center rounded-full bg-white/10 text-cream">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 hover:bg-white/10 hover:text-cream [&_svg]:size-5"
            title={t('wishlist.pages.previous')}
            aria-label={t('wishlist.pages.previous')}
            disabled={currentPageIndex <= 0}
            onClick={() => onGoTo(currentPageIndex - 1)}
          >
            <ChevronLeft />
          </Button>
          <span
            className="min-w-10 text-center text-sm font-semibold tabular-nums"
            aria-label={t('wishlist.pages.indicator', { current: currentPageIndex + 1, total: pageCount })}
          >
            {currentPageIndex + 1} / {pageCount}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 hover:bg-white/10 hover:text-cream [&_svg]:size-5"
            title={t('wishlist.pages.next')}
            aria-label={t('wishlist.pages.next')}
            disabled={currentPageIndex >= pageCount - 1}
            onClick={() => onGoTo(currentPageIndex + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={isSaving} className="h-11 shrink-0 px-4">
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          {t('common.action.save')}
          {isDirty && !isSaving && (
            <span className="h-2 w-2 rounded-full bg-amber-400" title={t('wishlist.editor.unsavedChanges')} />
          )}
        </Button>
      </div>
    </div>
  );
}

interface MenuItemProps {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, children, onClick, disabled, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-5 [&_svg]:shrink-0',
        danger ? 'text-red-600' : 'text-gray-800',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export default MobileEditorBar;
