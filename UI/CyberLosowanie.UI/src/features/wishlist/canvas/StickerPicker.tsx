import { useEffect } from 'react';
import { useTranslation } from '@/shared/i18n';
import { PICKER_STICKERS, StickerId } from './stickers';

interface StickerPickerProps {
  onSelect: (stickerId: StickerId) => void;
  onClose: () => void;
}

/**
 * Popover for picking a library sticker to drop on the canvas (modelled on
 * EmojiPicker). Stickers become sticker items, movable, scalable and rotatable
 * like images.
 */
function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[70vh] w-[min(92vw,420px)] overflow-y-auto rounded-2xl bg-white p-3 text-card-foreground shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('wishlist.sticker.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-sm font-medium text-gray-700">{t('wishlist.sticker.title')}</div>
        <div className="grid grid-cols-3 gap-2">
          {PICKER_STICKERS.map(({ id, src, labelKey }) => (
            <button
              key={id}
              type="button"
              className="flex min-h-11 flex-col items-center gap-1 rounded-lg p-2 text-xs text-gray-600 hover:bg-gray-100"
              onClick={() => onSelect(id)}
            >
              <img src={src} alt="" className="h-16 w-full object-contain" draggable={false} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StickerPicker;
