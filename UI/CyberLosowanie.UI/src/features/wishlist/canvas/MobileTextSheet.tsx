import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { TranslationKey, useTranslation } from '@/shared/i18n';
import { DEFAULT_TEXT_PLACEHOLDER, DOCUMENT_LIMITS, TEXT_FONTS, TEXT_SIZE_PRESETS } from './canvasConstants';
import { CanvasTextItem, TextFontId } from './canvasDocument';
import { cssFontFamily } from './textFonts';

const SIZE_LABEL_KEYS: Record<(typeof TEXT_SIZE_PRESETS)[number]['id'], TranslationKey> = {
  small: 'wishlist.text.size.small',
  medium: 'wishlist.text.size.medium',
  large: 'wishlist.text.size.large',
  huge: 'wishlist.text.size.huge',
};

// Glyph sizes of the "A" on each preset chip (px), smallest to largest.
const SIZE_GLYPH_PX = [13, 17, 22, 28];

export interface MobileTextSheetHandle {
  /** Ends editing with what is typed so far (system Back, tap outside). */
  commit: () => void;
  /**
   * Focuses the field again. Called from inside the user's tap: iOS opens the
   * keyboard only for a focus() made during the gesture, not for the one in
   * the mount effect.
   */
  focus: () => void;
}

interface MobileTextSheetProps {
  item: CanvasTextItem;
  onCommit: (text: string, fontSize: number, fontFamily: TextFontId | undefined) => void;
}

/**
 * Phone replacement for TextEditOverlay: a panel docked right above the
 * on-screen keyboard. The inline overlay sits wherever the text is on the page —
 * often under the keyboard — and at page scale its font is ~12px; here the
 * typing happens at a readable 16px, Enter starts a new line (phones have no
 * Shift+Enter) and "Done" commits. Font and size are picked here too, and the
 * field previews the font.
 */
const MobileTextSheet = forwardRef<MobileTextSheetHandle, MobileTextSheetProps>(
  function MobileTextSheet({ item, onCommit }, ref) {
    const { t } = useTranslation();
    // A new text starts empty; the default text is only a placeholder.
    const [text, setText] = useState(item.text === DEFAULT_TEXT_PLACEHOLDER ? '' : item.text);
    const [fontSize, setFontSize] = useState(item.fontSize);
    const [fontFamily, setFontFamily] = useState(item.fontFamily);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const keyboardInset = useKeyboardInset();

    const commit = () => onCommit(text, fontSize, fontFamily);
    const focusField = () => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      // Blur first: focus() on an already focused field is a no-op, so it
      // would not bring up a keyboard the mount effect failed to open.
      textarea.blur();
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    };
    useImperativeHandle(ref, () => ({ commit, focus: focusField }));

    // Enough on Android; iOS additionally needs focusField() from the gesture.
    useEffect(focusField, []);

    return (
      <>
        {/* Tapping the page around the panel finishes editing, like blur. */}
        <div className="fixed inset-0 z-[60] bg-pine-950/30" onClick={commit} aria-hidden />
        <div
          className="fixed inset-x-0 z-[61] rounded-t-2xl bg-white px-3 pb-3 pt-2.5 text-card-foreground shadow-elevated"
          style={{ bottom: keyboardInset }}
          role="dialog"
          aria-label={t('wishlist.text.edit')}
        >
          <textarea
            ref={textareaRef}
            value={text}
            rows={3}
            maxLength={DOCUMENT_LIMITS.maxTextLength}
            placeholder={t('wishlist.text.placeholder')}
            onChange={(event) => setText(event.target.value)}
            // 18px rather than 16: script fonts read smaller at the same size.
            className="block max-h-40 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-lg leading-snug outline-none focus:border-sky-500 focus:bg-white"
            style={{ color: item.fill === '#ffffff' ? '#111827' : item.fill, fontFamily: cssFontFamily(fontFamily) }}
          />
          {/* Fonts: one scrollable row, each name written in its own font. */}
          <div
            className="-mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3 pb-1"
            role="group"
            aria-label={t('wishlist.toolbar.fontGroup')}
          >
            {[undefined, ...TEXT_FONTS.map((font) => font.id)].map((id) => (
              <button
                key={id ?? 'default'}
                type="button"
                aria-pressed={fontFamily === id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setFontFamily(id)}
                className={cn(
                  'h-10 shrink-0 whitespace-nowrap rounded-xl px-3 text-lg text-gray-800',
                  fontFamily === id ? 'bg-gray-200 ring-1 ring-sky-500' : 'bg-gray-50 hover:bg-gray-100',
                )}
                style={{ fontFamily: cssFontFamily(id) }}
              >
                {TEXT_FONTS.find((font) => font.id === id)?.family ?? t('wishlist.toolbar.font.default')}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1" role="group" aria-label={t('wishlist.text.sizeGroup')}>
              {TEXT_SIZE_PRESETS.map((preset, index) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={t(SIZE_LABEL_KEYS[preset.id])}
                  aria-pressed={fontSize === preset.fontSize}
                  // Keep the keyboard up: a tap on a chip must not blur the textarea.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setFontSize(preset.fontSize)}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-xl font-semibold text-gray-700',
                    fontSize === preset.fontSize ? 'bg-gray-200 ring-1 ring-sky-500' : 'hover:bg-gray-100',
                  )}
                  style={{ fontSize: SIZE_GLYPH_PX[index] }}
                >
                  A
                </button>
              ))}
            </div>
            <Button type="button" onClick={commit} className="h-11 px-5">
              <Check aria-hidden /> {t('wishlist.text.done')}
            </Button>
          </div>
        </div>
      </>
    );
  },
);

/**
 * Height of the on-screen keyboard over the layout viewport. Android Chrome
 * resizes only the visual viewport when the keyboard opens, so a panel fixed
 * to the bottom would sit under the keys without this offset.
 */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) {
      return;
    }
    const update = () =>
      setInset(Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop));
    update();
    visualViewport.addEventListener('resize', update);
    visualViewport.addEventListener('scroll', update);
    return () => {
      visualViewport.removeEventListener('resize', update);
      visualViewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}

export default MobileTextSheet;
