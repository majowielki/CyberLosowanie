import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';
import { PICKER_STICKERS, STICKER_CATEGORIES, StickerCategory, StickerId } from './stickers';

interface StickerPickerProps {
  onSelect: (stickerId: StickerId) => void;
  onClose: () => void;
}

// Tabs that have at least one sticker to offer.
const CATEGORIES = STICKER_CATEGORIES.filter((category) =>
  PICKER_STICKERS.some((sticker) => sticker.category === category)
);

// The tab last used, so reopening the picker continues where the user left off.
let lastCategory: StickerCategory = CATEGORIES[0];

/**
 * Popover for picking a library sticker to drop on the canvas (modelled on
 * EmojiPicker). Stickers become sticker items, movable, scalable and rotatable
 * like images. One category tab is rendered at a time, from small thumbnails,
 * so opening the picker downloads only a handful of light files.
 */
function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<StickerCategory>(lastCategory);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectCategory = (next: StickerCategory) => {
    lastCategory = next;
    setCategory(next);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-[min(92vw,520px)] flex-col rounded-2xl bg-white p-3 text-card-foreground shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('wishlist.sticker.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-sm font-medium text-gray-700">{t('wishlist.sticker.title')}</div>
        <div
          role="tablist"
          aria-label={t('wishlist.sticker.categories')}
          className="mb-2 flex flex-wrap gap-1"
        >
          {CATEGORIES.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`sticker-tab-${tab}`}
              aria-selected={tab === category}
              aria-controls="sticker-tabpanel"
              className={cn(
                'min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition-colors',
                tab === category ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              onClick={() => selectCategory(tab)}
            >
              {t(`wishlist.sticker.category.${tab}`)}
            </button>
          ))}
        </div>
        <div
          id="sticker-tabpanel"
          role="tabpanel"
          aria-labelledby={`sticker-tab-${category}`}
          // auto-rows-max: rows keep their content height and the panel scrolls; without it
          // a short panel squeezes the rows and the labels overlap the next row.
          className="grid auto-rows-max grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4"
        >
          {PICKER_STICKERS.filter((sticker) => sticker.category === category).map(({ id, thumbSrc, labelKey }) => (
            <button
              key={id}
              type="button"
              className="flex min-h-11 flex-col items-center gap-1 rounded-lg p-2 text-center text-xs text-gray-600 hover:bg-gray-100"
              onClick={() => onSelect(id)}
            >
              <img
                src={thumbSrc}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-16 w-full object-contain"
                draggable={false}
              />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StickerPicker;
