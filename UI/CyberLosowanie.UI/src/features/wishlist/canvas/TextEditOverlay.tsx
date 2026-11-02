import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { DEFAULT_TEXT_PLACEHOLDER, DOCUMENT_LIMITS, TEXT_BACKGROUND_PADDING } from './canvasConstants';
import { cssFontFamily } from './textFonts';
import { textHighlightCss } from './textHighlight';
import { CanvasTextItem } from './canvasDocument';

interface TextEditOverlayProps {
  item: CanvasTextItem;
  /** Current stage transform — maps document coordinates to container pixels. */
  stageScale: number;
  stagePosition: { x: number; y: number };
  onCommit: (text: string) => void;
}

/**
 * HTML <textarea> laid exactly over the edited Konva.Text node (the standard
 * Konva "editable text" pattern — canvas alone cannot take keyboard input).
 * The node itself is hidden by WishlistCanvas while this overlay is mounted.
 *
 * Written for letters: Enter starts a new line, the field grows with the text
 * (all of it stays visible), and Esc, Ctrl+Enter or a click outside finish
 * editing — always keeping what was typed.
 */
function TextEditOverlay({ item, stageScale, stagePosition, onCommit }: TextEditOverlayProps) {
  const { t } = useTranslation();
  // A new text starts empty; the default text is only a placeholder (committed
  // empty, the item is removed instead of keeping "Wpisz tekst...").
  const [text, setText] = useState(item.text === DEFAULT_TEXT_PLACEHOLDER ? '' : item.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontSize = item.fontSize * stageScale;

  useEffect(() => {
    // Deferred past the click that created the text: its mousedown still has
    // the default action pending (focus moves to the page), which would blur
    // a textarea focused right away and end the edit before typing starts.
    const timer = window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      // Caret at the end: selecting everything made the first key typed into
      // a double-clicked letter replace the whole letter.
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Grow with the text, so every line stays visible instead of scrolling
  // inside a one-line box.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '0px';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text, fontSize, item.width, item.fontFamily]);

  const commit = () => onCommit(text);

  return (
    <div
      className="absolute z-10"
      style={{
        left: item.x * stageScale + stagePosition.x,
        top: item.y * stageScale + stagePosition.y,
        width: item.width * stageScale,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'top left',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        rows={1}
        maxLength={DOCUMENT_LIMITS.maxTextLength}
        placeholder={t('wishlist.text.placeholder')}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
            event.preventDefault();
            commit();
          }
        }}
        // An outline, not a border: a border would narrow the text box by its
        // width and wrap the lines differently than on the canvas.
        className="block w-full resize-none overflow-hidden bg-transparent p-0 m-0 border-0 outline-dashed outline-1 outline-offset-2 outline-sky-500"
        style={{
          fontSize,
          lineHeight: 1,
          fontFamily: cssFontFamily(item.fontFamily),
          color: item.fill,
          ...textHighlightCss(item, fontSize),
        }}
      />
      <p
        className="pointer-events-none w-max rounded bg-gray-900/80 px-2 py-0.5 text-xs text-white"
        // Below the backdrop's margin when the text has one.
        style={{ marginTop: 8 + (item.background ? fontSize * TEXT_BACKGROUND_PADDING : 0) }}
        aria-hidden
      >
        {t('wishlist.text.editHint')}
      </p>
    </div>
  );
}

export default TextEditOverlay;
