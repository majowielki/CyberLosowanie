import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Ellipse, Group, Line, Path, Rect, Star } from 'react-konva';
import { CanvasShapeItem } from './canvasDocument';

/** Placement/interaction props shared by every item node type (see WishlistCanvas). */
export interface ShapeNodeProps {
  x: number;
  y: number;
  rotation: number;
  draggable: boolean;
  onClick: () => void;
  onTap: () => void;
  onDragEnd: (event: KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (event: KonvaEventObject<Event>) => void;
}

interface CanvasShapeNodeProps {
  item: CanvasShapeItem;
  nodeProps?: ShapeNodeProps;
  registerNode?: (id: string, node: Konva.Node | null) => void;
  /** Non-interactive rendering (the drag preview while drawing). */
  preview?: boolean;
}

// Heart outline in a 100×100 box; scaled to the item's size at render time.
const HEART_PATH =
  'M50 90 C 22 68, 4 50, 4 30 C 4 15, 15 5, 28 5 C 38 5, 46 11, 50 19 C 54 11, 62 5, 72 5 C 85 5, 96 15, 96 30 C 96 50, 78 68, 50 90 Z';

/**
 * A shape item: a Group at the item's origin (so rotation matches every other
 * item type) holding the geometry fitted to width × height. Scaled shapes keep
 * a constant outline thanks to strokeScaleEnabled=false.
 */
function CanvasShapeNode({ item, nodeProps, registerNode, preview = false }: CanvasShapeNodeProps) {
  const { width: w, height: h, stroke, strokeWidth } = item;
  const fill = item.fill ?? undefined;
  const common = { stroke, strokeWidth, fill, lineJoin: 'round' as const, strokeScaleEnabled: false };

  let geometry;
  switch (item.shape) {
    case 'ellipse':
      geometry = <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...common} />;
      break;
    case 'triangle':
      geometry = <Line points={[w / 2, 0, w, h, 0, h]} closed {...common} />;
      break;
    case 'diamond':
      geometry = <Line points={[w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]} closed {...common} />;
      break;
    case 'star':
      // Drawn in a unit circle and stretched to the box.
      geometry = (
        <Star
          x={w / 2}
          y={h / 2}
          numPoints={5}
          innerRadius={0.2}
          outerRadius={0.5}
          scaleX={w}
          scaleY={h}
          {...common}
        />
      );
      break;
    case 'heart':
      geometry = <Path data={HEART_PATH} scaleX={w / 100} scaleY={h / 100} {...common} />;
      break;
    case 'arrow':
      geometry = (
        <Line
          points={[0, h * 0.3, w * 0.6, h * 0.3, w * 0.6, 0, w, h / 2, w * 0.6, h, w * 0.6, h * 0.7, 0, h * 0.7]}
          closed
          {...common}
        />
      );
      break;
    case 'rect':
    default:
      geometry = <Rect width={w} height={h} {...common} />;
  }

  if (preview) {
    return (
      <Group x={item.x} y={item.y} rotation={item.rotation} listening={false} opacity={0.85}>
        {geometry}
      </Group>
    );
  }

  return (
    <Group ref={(node) => registerNode?.(item.id, node)} {...nodeProps}>
      {/* Invisible hit area so an outline-only shape can be grabbed anywhere inside. */}
      <Rect width={w} height={h} fill="transparent" />
      {geometry}
    </Group>
  );
}

export default CanvasShapeNode;
