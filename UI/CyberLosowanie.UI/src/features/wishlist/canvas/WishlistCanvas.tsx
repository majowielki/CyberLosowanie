import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  CANVAS_BACKGROUND,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DOCUMENT_LIMITS,
  MIN_TEXT_WIDTH,
  TEXT_FONT_FAMILY,
} from './canvasConstants';
import {
  CanvasImageItem,
  CanvasItem,
  CanvasStroke,
  CanvasTextItem,
} from './canvasDocument';
import { useAuthorizedImage } from './useAuthorizedImage';
import type { Point } from './useCanvasEngine';
import type { StageViewport } from './useStageViewport';

export type CanvasItemPatch = Partial<Omit<CanvasTextItem, 'id' | 'type'>> &
  Partial<Omit<CanvasImageItem, 'id' | 'type'>>;

export interface WishlistCanvasProps {
  strokes: CanvasStroke[];
  items: CanvasItem[];
  stageProps: StageViewport['stageProps'];
  /** Page background color (#rrggbb). */
  background?: string;
  /** In-progress stroke rendered on top of committed ones (editor only). */
  liveStroke?: CanvasStroke | null;
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
  liveStroke = null,
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

  const handleMouseLeave = () => {
    setCursorPos(null);
    onPointerUp?.();
  };

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
      if (itemsInteractive) {
        onSelectItem?.(item.id);
      }
    },
    onTap: () => {
      if (itemsInteractive) {
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
        />
      </Layer>

      {/* Freehand drawing — the only layer destination-out may touch. */}
      <Layer listening={false}>
        <Group clipX={0} clipY={0} clipWidth={CANVAS_WIDTH} clipHeight={CANVAS_HEIGHT}>
          {[...strokes, ...(liveStroke ? [liveStroke] : [])].map((stroke) => (
            <Line
              key={stroke.id}
              points={stroke.points}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              globalCompositeOperation={
                stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Group>
      </Layer>

      {/* Items (z-order = array order) + transformer. */}
      <Layer>
        <Group
          clipX={0}
          clipY={0}
          clipWidth={CANVAS_WIDTH}
          clipHeight={CANVAS_HEIGHT}
          listening={itemsInteractive}
        >
          {items.map((item) =>
            item.type === 'text' ? (
              <Text
                key={item.id}
                ref={(node) => registerItemNode(item.id, node)}
                {...sharedItemProps(item)}
                text={item.text}
                fontSize={item.fontSize}
                fontFamily={TEXT_FONT_FAMILY}
                fill={item.fill}
                width={item.width}
                visible={item.id !== editingItemId}
                onDblClick={() => onTextEditRequest?.(item.id)}
                onDblTap={() => onTextEditRequest?.(item.id)}
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
        </Group>
        {editable && (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
            ]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
            }
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

export default WishlistCanvas;
