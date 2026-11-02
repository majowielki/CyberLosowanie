import type { CSSProperties } from 'react';
import type Konva from 'konva';
import type { Context } from 'konva/lib/Context';
import type { Shape } from 'konva/lib/Shape';
import {
  TEXT_BACKGROUND_OPACITY,
  TEXT_BACKGROUND_PADDING,
  TEXT_BACKGROUND_RADIUS,
  TEXT_HIGHLIGHTS,
  TEXT_OUTLINE_WIDTH,
} from './canvasConstants';
import type { CanvasTextItem, TextHighlight } from './canvasDocument';

export type TextHighlightPreset = (typeof TEXT_HIGHLIGHTS)[number];

/** The preset a text's highlight matches (none for a combination the editor does not offer). */
export const textHighlightPreset = (highlight: TextHighlight): TextHighlightPreset =>
  TEXT_HIGHLIGHTS.find(
    (preset) =>
      ('background' in preset ? preset.background : undefined) === highlight.background &&
      ('outline' in preset ? preset.outline : undefined) === highlight.outline,
  ) ?? TEXT_HIGHLIGHTS[0];

/** Both fields, so applying a preset also clears the other kind of highlight. */
export const presetHighlight = (preset: TextHighlightPreset): TextHighlight => ({
  background: 'background' in preset ? preset.background : undefined,
  outline: 'outline' in preset ? preset.outline : undefined,
});

/**
 * Konva props of a text's highlight. The outline is a stroke under the fill;
 * the backdrop is drawn by the Text node itself, so it moves, scales and
 * rotates with the text and needs no extra node. Its colour is read from the
 * node's `textBackground` attribute: the draw functions stay module-level, so
 * the items layer is not redrawn on every render.
 */
export const textHighlightNodeProps = (item: CanvasTextItem): Konva.TextConfig => ({
  ...(item.outline
    ? {
        stroke: item.outline,
        strokeWidth: item.fontSize * TEXT_OUTLINE_WIDTH,
        fillAfterStrokeEnabled: true,
        lineJoin: 'round',
      }
    : {}),
  ...(item.background
    ? {
        textBackground: item.background,
        sceneFunc: textBackgroundSceneFunc,
        hitFunc: textBackgroundHitFunc,
      }
    : {}),
});

interface BackgroundBox {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/** The box hugs the widest line (not the wrap width), with a margin all round. */
function backgroundBox(node: Konva.Text): BackgroundBox {
  const fontSize = node.fontSize();
  const padding = fontSize * TEXT_BACKGROUND_PADDING;
  return {
    x: -padding,
    y: -padding,
    width: node.getTextWidth() + 2 * padding,
    height: node.height() + 2 * padding,
    radius: fontSize * TEXT_BACKGROUND_RADIUS,
  };
}

function textBackgroundSceneFunc(context: Context, shape: Shape) {
  const node = shape as Konva.Text;
  const box = backgroundBox(node);
  const native = context._context;
  native.save();
  native.globalAlpha *= TEXT_BACKGROUND_OPACITY;
  native.fillStyle = node.getAttr('textBackground');
  native.beginPath();
  native.roundRect(box.x, box.y, box.width, box.height, box.radius);
  native.fill();
  native.restore();
  node._sceneFunc(context);
}

/** The backdrop is part of the text for clicks and drags too. */
function textBackgroundHitFunc(context: Context, shape: Shape) {
  const box = backgroundBox(shape as Konva.Text);
  context.beginPath();
  context.rect(box.x, box.y, box.width, box.height);
  context.closePath();
  context.fillStrokeShape(shape);
}

/** CSS for the HTML text editor, so the highlight stays visible while typing. */
export function textHighlightCss(item: CanvasTextItem, fontSize: number): CSSProperties {
  const css: CSSProperties = {};
  if (item.outline) {
    // Stroke under the fill, as on the canvas.
    css.WebkitTextStroke = `${fontSize * TEXT_OUTLINE_WIDTH}px ${item.outline}`;
    css.paintOrder = 'stroke fill';
  }
  if (item.background) {
    const red = parseInt(item.background.slice(1, 3), 16);
    const green = parseInt(item.background.slice(3, 5), 16);
    const blue = parseInt(item.background.slice(5, 7), 16);
    const color = `rgba(${red}, ${green}, ${blue}, ${TEXT_BACKGROUND_OPACITY})`;
    css.backgroundColor = color;
    // The spread grows the box past the text like the canvas margin, without
    // padding the textarea (which would change where the text wraps).
    css.boxShadow = `0 0 0 ${fontSize * TEXT_BACKGROUND_PADDING}px ${color}`;
    css.borderRadius = fontSize * TEXT_BACKGROUND_RADIUS;
  }
  return css;
}
