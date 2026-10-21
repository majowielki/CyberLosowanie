import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import {
  CANVAS_BACKGROUND,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOCUMENT_LIMITS,
  MIN_TEXT_WIDTH,
} from './canvasConstants';
import {
  CanvasImageItem,
  CanvasItem,
  CanvasDrawing,
  CanvasShapeItem,
  CanvasStickerItem,
  CanvasStroke,
  CanvasTextItem,
  PagePattern,
} from './canvasDocument';
import CanvasShapeNode from './CanvasShapeNode';
import PagePatternLayer from './PagePatternLayer';
import StrokeShape from './StrokeShape';
import { STICKERS } from './stickers';
import { useAuthorizedImage } from './useAuthorizedImage';
import { cssFontFamily, useTextFontsReady } from './textFonts';
import { useStickerImage } from './useStickerImage';
import type { RasterImage } from './areaFill';
import type { Point } from './useCanvasEngine';
import type { StageViewport } from './useStageViewport';

export type CanvasItemPatch = Partial<Omit<CanvasTextItem, 'id' | 'type'>> &
  Partial<Omit<CanvasImageItem, 'id' | 'type'>> &
  Partial<Omit<CanvasShapeItem, 'id' | 'type'>> &
  Partial<Omit<CanvasStickerItem, 'id' | 'type'>>;

export interface WishlistCanvasProps {
  /** Drawing layer: strokes and area fills, in drawing order. */
  strokes: CanvasDrawing[];
  items: CanvasItem[];
  stageProps: StageViewport['stageProps'];
  /** Page background color (#rrggbb). */
  background?: string;
  /** Background pattern drawn over the colour; `pageId` seeds its scatter. */
  pattern?: PagePattern;
  pageId?: string;
  /** In-progress stroke rendered on top of committed ones (editor only). */
  liveStroke?: CanvasStroke | null;
  /** Shape being dragged out with the shape tool (editor only). */
  previewShape?: CanvasShapeItem | null;
  /**
   * Fill-tool mode: clicking an item recolours it instead of selecting it.
   * Items listen to clicks while this is set even though they are not
   * otherwise interactive.
   */
  onFillItem?: (id: string) => void;
  /**
   * Filled with a function that rasterizes the drawing layer (strokes + fills,
   * nothing else) at document resolution — the input of the area fill.
   */
  drawingSnapshotRef?: MutableRefObject<(() => RasterImage | null) | null>;
  /** Brush-size preview cursor for pen/eraser (radius in document units). */
  brushCursor?: { radius: number; color: string } | null;
  editable?: boolean;
  /** True when the select tool is active — items react to clicks/drags. */
  itemsInteractive?: boolean;
  selectedItemId?: string | null;
  /** Text item currently edited in the HTML overlay — hidden on the canvas. */
  editingItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
  onItemChange?: (id: string, patch: CanvasItemPatch) => void;
  onTextEditRequest?: (id: string) => void;
  /** Pointer position in document coordinates (stage transform already applied). */
  onPointerDown?: (position: Point, isBackground: boolean) => void;
  onPointerMove?: (position: Point) => void;
  onPointerUp?: () => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// Hoisted so the Transformer's props stay referentially stable — a new array or
// function on every render makes react-konva redraw the items layer each frame
// of a stroke.
const TRANSFORMER_ANCHORS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'middle-left',
  'middle-right',
];
const keepMinimumBox = (oldBox: TransformerBox, newBox: TransformerBox): TransformerBox =>
  newBox.width < 5 || newBox.height < 5 ? oldBox : newBox;
type TransformerBox = Parameters<NonNullable<Konva.TransformerConfig['boundBoxFunc']>>[0];

// While a stroke is drawn the committed strokes are cached as one bitmap, so
// each frame redraws a single image plus the live stroke instead of every
// stroke. The cap keeps the bitmap at most ~3x the document (≈15 MP) on deep zoom.
const MAX_STROKE_CACHE_PIXEL_RATIO = 3;

/**
 * Shared Stage renderer for the editor and the read-only viewer. Layer order
 * matters: strokes live on their own layer below the items, because the eraser
 * uses destination-out compositing and must only affect the drawing layer
 * (doc 3.3) — text and images are removed via selection, never erased.
 */
function WishlistCanvas({
  strokes,
  items,
  stageProps,
  background = CANVAS_BACKGROUND,
  pattern,
  pageId = '',
  liveStroke = null,
  previewShape = null,
  onFillItem,
  drawingSnapshotRef,
  brushCursor = null,
  editable = false,
  itemsInteractive = false,
  selectedItemId = null,
  editingItemId = null,
  onSelectItem,
  onItemChange,
  onTextEditRequest,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: WishlistCanvasProps) {
  const itemNodesRef = useRef<Map<string, Konva.Node>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const committedStrokesRef = useRef<Konva.Group>(null);
  const isDrawing = liveStroke !== null;
  // Finger-sized transformer handles on touch screens (Konva's default 10px
  // anchors are a mouse target).
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');
  // Chrome (notably on Android) frees the bitmaps of canvases in a background
  // tab and later hands back a fresh context: the pixel-ratio scale Konva set
  // up is gone, so the page drew at 1/devicePixelRatio size in a corner and the
  // rest of the canvas stayed empty. Re-apply it on restore and on return.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const repairLayers = () => {
      stage.getLayers().forEach((layer) => {
        const canvases = [layer.getCanvas(), layer.getHitCanvas()];
        const lostScale = canvases.some(
          (canvas) => canvas.getContext()._context.getTransform().a !== canvas.getPixelRatio(),
        );
        if (lostScale) {
          // setSize resets the bitmap and scales the fresh context by the pixel ratio.
          canvases.forEach((canvas) =>
            canvas.setSize(canvas.width / canvas.getPixelRatio(), canvas.height / canvas.getPixelRatio()),
          );
          layer.batchDraw();
        }
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        repairLayers();
      }
    };
    const container = stage.container();
    // contextrestored does not bubble — catch it on the way down.
    container.addEventListener('contextrestored', repairLayers, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      container.removeEventListener('contextrestored', repairLayers, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // A web font that arrives after the first draw: re-measure the texts (Konva
  // caches line widths/wrapping) and redraw, or they keep the fallback's layout.
  const fontsReady = useTextFontsReady(items);
  useEffect(() => {
    if (fontsReady === 0) {
      return;
    }
    itemNodesRef.current.forEach((node) => {
      if (node.getClassName() === 'Text') {
        (node as Konva.Text)._setTextData();
      }
    });
    transformerRef.current?.forceUpdate();
    transformerRef.current?.getStage()?.batchDraw();
  }, [fontsReady]);
  // Pointer position (document coords) for the brush-size preview cursor.
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const registerItemNode = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      itemNodesRef.current.set(id, node);
    } else {
      itemNodesRef.current.delete(id);
    }
  }, []);

  // Attach the transformer to the selected node (classic Konva pattern).
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }
    const node = selectedItemId ? itemNodesRef.current.get(selectedItemId) : undefined;
    transformer.nodes(node && selectedItemId !== editingItemId ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedItemId, editingItemId, items]);

  // Cache on stroke start, drop on stroke end (the next frame shows live vectors
  // again). Strokes cannot change mid-stroke, so one snapshot per stroke is enough.
  useEffect(() => {
    const group = committedStrokesRef.current;
    if (!group) {
      return;
    }
    if (isDrawing && strokes.length > 0) {
      const pixelRatio = Math.min(
        (stageProps.scaleX || 1) * (window.devicePixelRatio || 1),
        MAX_STROKE_CACHE_PIXEL_RATIO,
      );
      group.cache({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, pixelRatio });
    } else {
      group.clearCache();
    }
    group.getLayer()?.batchDraw();
    // Only the drawing state matters: re-caching on every scale change mid-stroke is wasted work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing]);

  useEffect(() => {
    if (!drawingSnapshotRef) {
      return;
    }
    drawingSnapshotRef.current = () => {
      const group = committedStrokesRef.current;
      const stage = group?.getStage();
      if (!group || !stage) {
        return null;
      }
      // toCanvas works in stage (screen) coordinates: crop to the page and
      // undo the zoom, so one pixel is one document unit. The extra half unit
      // keeps float rounding from cutting the last pixel column/row.
      const scale = stage.scaleX() || 1;
      const canvas = group.toCanvas({
        x: stage.x(),
        y: stage.y(),
        width: (CANVAS_WIDTH + 0.5) * scale,
        height: (CANVAS_HEIGHT + 0.5) * scale,
        pixelRatio: 1 / scale,
      });
      const context = canvas.getContext('2d', { willReadFrequently: true });
      return context ? context.getImageData(0, 0, canvas.width, canvas.height) : null;
    };
    return () => {
      drawingSnapshotRef.current = null;
    };
  }, [drawingSnapshotRef]);

  const getDocumentPosition = (event: KonvaEventObject<MouseEvent | TouchEvent>): Point | null => {
    const stage = event.target.getStage();
    return stage ? stage.getRelativePointerPosition() : null;
  };

  const isBackgroundTarget = (event: KonvaEventObject<MouseEvent | TouchEvent>): boolean =>
    event.target === event.target.getStage() || event.target.name() === 'background';

  const handlePointerDown = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const position = getDocumentPosition(event);
    if (position) {
      onPointerDown?.(position, isBackgroundTarget(event));
    }
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const position = getDocumentPosition(event);
    if (position) {
      setCursorPos(position);
      onPointerMove?.(position);
    }
  };

  // Leaving the canvas only hides the brush cursor: the stroke goes on when the
  // pointer comes back with the button still held (the editor ends it on the
  // window's pointerup).
  const handleMouseLeave = () => setCursorPos(null);

  const handleTouchStart = (event: KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length === 1) {
      handlePointerDown(event);
    }
  };

  // The viewport owns two-finger gestures (pinch zoom/pan); a single finger
  // draws or drags. Both handlers are composed here so callers pass plain props.
  const handleTouchMove = (event: KonvaEventObject<TouchEvent>) => {
    stageProps.onTouchMove(event);
    if (event.evt.touches.length === 1) {
      const position = getDocumentPosition(event);
      if (position) {
        setCursorPos(position);
        onPointerMove?.(position);
      }
    }
  };

  const handleTouchEnd = (event: KonvaEventObject<TouchEvent>) => {
    stageProps.onTouchEnd(event);
    setCursorPos(null);
    onPointerUp?.();
  };

  const handleItemTransformEnd = (item: CanvasItem, node: Konva.Node) => {
    // Konva applies transforms as scale — bake them into document units and
    // reset the node scale, so the stored model stays scale-free.
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const base: CanvasItemPatch = {
      x: node.x(),
      y: node.y(),
      rotation: Math.round(node.rotation() * 100) / 100,
    };

    if (item.type === 'text') {
      onItemChange?.(item.id, {
        ...base,
        width: Math.max(MIN_TEXT_WIDTH, item.width * scaleX),
        fontSize: clamp(
          item.fontSize * scaleY,
          DOCUMENT_LIMITS.minFontSize,
          DOCUMENT_LIMITS.maxFontSize,
        ),
      });
    } else {
      onItemChange?.(item.id, {
        ...base,
        width: Math.max(10, item.width * scaleX),
        height: Math.max(10, item.height * scaleY),
      });
    }
  };

  const sharedItemProps = (item: CanvasItem): SharedItemNodeProps => ({
    x: item.x,
    y: item.y,
    rotation: item.rotation,
    draggable: editable && itemsInteractive,
    onClick: () => {
      if (onFillItem) {
        onFillItem(item.id);
      } else if (itemsInteractive) {
        onSelectItem?.(item.id);
      }
    },
    onTap: () => {
      if (onFillItem) {
        onFillItem(item.id);
      } else if (itemsInteractive) {
        onSelectItem?.(item.id);
      }
    },
    onDragEnd: (event: KonvaEventObject<DragEvent>) =>
      onItemChange?.(item.id, { x: event.target.x(), y: event.target.y() }),
    onTransformEnd: (event: KonvaEventObject<Event>) =>
      handleItemTransformEnd(item, event.target),
  });

  return (
    <Stage
      ref={stageRef}
      {...stageProps}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={editable ? handlePointerDown : undefined}
      onMouseMove={editable ? handleMouseMove : undefined}
      onMouseUp={editable ? onPointerUp : undefined}
      onMouseLeave={editable ? handleMouseLeave : undefined}
      onTouchStart={editable ? handleTouchStart : undefined}
    >
      {/* Background — separate layer so the eraser cannot cut through it. */}
      <Layer>
        <Rect
          name="background"
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill={background}
          // Konva cancels the touch on a listening shape; read-only, a swipe on
          // the page must scroll the browser page instead.
          preventDefault={editable}
        />
        <PagePatternLayer pattern={pattern} background={background} seed={pageId} />
      </Layer>

      {/* Freehand drawing — the only layer destination-out may touch. */}
      <Layer listening={false}>
        <Group clipX={0} clipY={0} clipWidth={CANVAS_WIDTH} clipHeight={CANVAS_HEIGHT}>
          <Group ref={committedStrokesRef}>
            {strokes.map((stroke) => (
              <StrokeShape key={stroke.id} stroke={stroke} />
            ))}
          </Group>
          {/* Same layer as the committed strokes, so a live eraser stroke
              (destination-out) still cuts through them while drawing. */}
          {liveStroke && <StrokeShape stroke={liveStroke} />}
        </Group>
      </Layer>

      {/* Items (z-order = array order) + transformer. */}
      <Layer>
        <Group
          clipX={0}
          clipY={0}
          clipWidth={CANVAS_WIDTH}
          clipHeight={CANVAS_HEIGHT}
          listening={itemsInteractive || Boolean(onFillItem)}
        >
          {items.map((item) =>
            item.type === 'shape' ? (
              <CanvasShapeNode
                key={item.id}
                item={item}
                nodeProps={sharedItemProps(item)}
                registerNode={registerItemNode}
              />
            ) : item.type === 'text' ? (
              <Text
                key={item.id}
                ref={(node) => registerItemNode(item.id, node)}
                {...sharedItemProps(item)}
                text={item.text}
                fontSize={item.fontSize}
                fontFamily={cssFontFamily(item.fontFamily)}
                fill={item.fill}
                width={item.width}
                visible={item.id !== editingItemId}
                onDblClick={() => onTextEditRequest?.(item.id)}
                onDblTap={() => onTextEditRequest?.(item.id)}
              />
            ) : item.type === 'sticker' ? (
              <CanvasStickerNode
                key={item.id}
                item={item}
                nodeProps={sharedItemProps(item)}
                registerNode={registerItemNode}
              />
            ) : (
              <CanvasImageNode
                key={item.id}
                item={item}
                nodeProps={sharedItemProps(item)}
                registerNode={registerItemNode}
              />
            ),
          )}
          {previewShape && <CanvasShapeNode item={previewShape} preview />}
        </Group>
        {editable && (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={TRANSFORMER_ANCHORS}
            boundBoxFunc={keepMinimumBox}
            anchorSize={isCoarsePointer ? 22 : 10}
            anchorCornerRadius={isCoarsePointer ? 11 : 0}
            rotateAnchorOffset={isCoarsePointer ? 40 : 50}
            padding={isCoarsePointer ? 6 : 0}
          />
        )}
      </Layer>

      {/* Brush-size preview cursor (pen/eraser). Two concentric strokes keep it
          visible on any background; outline width is divided by the stage scale
          so it stays a constant thickness on screen at every zoom level. */}
      {brushCursor && cursorPos && (
        <Layer listening={false}>
          <Circle
            x={cursorPos.x}
            y={cursorPos.y}
            radius={brushCursor.radius}
            stroke="#111827"
            strokeWidth={2 / (stageProps.scaleX || 1)}
          />
          <Circle
            x={cursorPos.x}
            y={cursorPos.y}
            radius={brushCursor.radius}
            stroke="#ffffff"
            strokeWidth={1 / (stageProps.scaleX || 1)}
          />
        </Layer>
      )}
    </Stage>
  );
}

/** Placement/interaction props shared by every item node type. */
interface SharedItemNodeProps {
  x: number;
  y: number;
  rotation: number;
  draggable: boolean;
  onClick: () => void;
  onTap: () => void;
  onDragEnd: (event: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: KonvaEventObject<Event>) => void;
}

interface CanvasImageNodeProps {
  item: CanvasImageItem;
  nodeProps: SharedItemNodeProps;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

/**
 * Image element backed by the authorized proxy. Until the blob arrives a light
 * placeholder keeps the element visible, selectable and transformable.
 */
function CanvasImageNode({ item, nodeProps, registerNode }: CanvasImageNodeProps) {
  const image = useAuthorizedImage(item.path);

  if (!image) {
    return (
      <Rect
        ref={(node) => registerNode(item.id, node)}
        {...nodeProps}
        width={item.width}
        height={item.height}
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth={1}
      />
    );
  }

  return (
    <KonvaImage
      ref={(node) => registerNode(item.id, node)}
      {...nodeProps}
      image={image}
      width={item.width}
      height={item.height}
    />
  );
}

interface CanvasStickerNodeProps {
  item: CanvasStickerItem;
  nodeProps: SharedItemNodeProps;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

/**
 * Library sticker drawn from its bundled file. Until the file loads (or for an
 * id this build does not know) an invisible box of the same size keeps the
 * element selectable and transformable.
 */
function CanvasStickerNode({ item, nodeProps, registerNode }: CanvasStickerNodeProps) {
  const image = useStickerImage(STICKERS[item.stickerId]?.src);

  if (!image) {
    return (
      <Rect
        ref={(node) => registerNode(item.id, node)}
        {...nodeProps}
        width={item.width}
        height={item.height}
        fill="transparent"
      />
    );
  }

  return (
    <KonvaImage
      ref={(node) => registerNode(item.id, node)}
      {...nodeProps}
      image={image}
      width={item.width}
      height={item.height}
    />
  );
}

export default WishlistCanvas;
