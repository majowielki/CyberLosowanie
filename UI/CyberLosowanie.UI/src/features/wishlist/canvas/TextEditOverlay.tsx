import { useEffect, useRef, useState } from 'react';
import { DOCUMENT_LIMITS, TEXT_FONT_FAMILY } from './canvasConstants';
import { CanvasTextItem } from './canvasDocument';

interface TextEditOverlayProps {
  item: CanvasTextItem;
  /** Current stage transform — maps document coordinates to container pixels. */
  stageScale: number;
  stagePosition: { x: number; y: number };
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/**
 * HTML <textarea> laid exactly over the edited Konva.Text node (the standard
 * Konva "editable text" pattern — canvas alone cannot take keyboard input).
 * The node itself is hidden by WishlistCanvas while this overlay is mounted.
 */
function TextEditOverlay({
  item,
  stageScale,
  stagePosition,
  onCommit,
  onCancel,
}: TextEditOverlayProps) {
  const [text, setText] = useState(item.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const commit = () => onCommit(text);

  return (
    <textarea
      ref={textareaRef}
      value={text}
      maxLength={DOCUMENT_LIMITS.maxTextLength}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="absolute z-10 resize-none overflow-hidden bg-transparent outline-none border border-dashed border-sky-500 p-0 m-0"
      style={{
        left: item.x * stageScale + stagePosition.x,
        top: item.y * stageScale + stagePosition.y,
        width: item.width * stageScale,
        minHeight: item.fontSize * stageScale * 1.2,
        fontSize: item.fontSize * stageScale,
        lineHeight: 1,
        fontFamily: TEXT_FONT_FAMILY,
        color: item.fill,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'top left',
      }}
    />
  );
}

export default TextEditOverlay;
