import { useEffect } from 'react';
import { useTranslation } from '@/shared/i18n';

// Curated set — gifts, holidays, reactions and common wishlist objects. Emojis
// are inserted as text items, so no new document element type is needed.
const EMOJIS = [
  '🎁', '🎀', '🎄', '🎅', '⛄', '❄️', '⭐', '🌟', '✨', '🎉', '🎊', '🥳',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖', '😀', '😍', '🥰', '😎',
  '🤩', '😂', '👀', '👍', '🙏', '🔥', '💯', '🎈', '🍰', '🎂', '🍫', '🍕',
  '🧸', '🎮', '🕹️', '🎧', '🎸', '🎨', '📚', '👟', '👕', '👗', '💄', '💍',
  '⌚', '📱', '💻', '📷', '🚲', '🛹', '⚽', '🏀', '🎯', '🐶', '🐱', '🦄',
  '🌈', '🌸', '🌺', '🍀',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * Small popover for picking an emoji to drop on the canvas. Emojis are inserted
 * as Konva text items (see WishlistEditor), so they are movable, scalable and
 * rotatable like any other text.
 */
function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
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
        className="max-h-[70vh] w-[min(92vw,420px)] overflow-y-auto rounded-lg bg-white p-3 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('wishlist.emoji.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-sm font-medium text-gray-700">{t('wishlist.emoji.title')}</div>
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded p-1 text-2xl leading-none hover:bg-gray-100"
              onClick={() => onSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmojiPicker;
