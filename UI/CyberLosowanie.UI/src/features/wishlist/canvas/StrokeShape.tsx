import { memo } from 'react';
import { Circle, Group, Line, Shape, Star } from 'react-konva';
import type Konva from 'konva';
import { CanvasDrawing, CanvasFill, CanvasStroke, StrokeKind, isCanvasFill } from './canvasDocument';
import { DEFAULT_STROKE_KIND } from './canvasConstants';
import { darken, jitterOffset, lighten, sampleSparkles } from './strokeStyles';

/**
 * Renders one entry of the drawing layer: an area fill, or a stroke in its pen
 * style. Memoised, so committed entries skip re-rendering while a new stroke
 * is drawn.
 */
function DrawingShapeComponent({ stroke }: { stroke: CanvasDrawing }) {
  return isCanvasFill(stroke) ? <FillShape fill={stroke} /> : <StrokeShapeComponent stroke={stroke} />;
}

/**
 * Area fill: all rings in one path filled with the even-odd rule, so inner
 * rings cut holes (an island inside the region stays unpainted).
 */
function FillShape({ fill }: { fill: CanvasFill }) {
  const drawRings = (context: Konva.Context, shape: Konva.Shape) => {
    context.beginPath();
    for (const ring of fill.rings) {
      context.moveTo(ring[0], ring[1]);
      for (let i = 2; i < ring.length; i += 2) {
        context.lineTo(ring[i], ring[i + 1]);
      }
      context.closePath();
    }
    context.fillStrokeShape(shape);
  };

  return <Shape sceneFunc={drawRings} fill={fill.color} fillRule="evenodd" listening={false} perfectDrawEnabled={false} />;
}

/**
 * Renders one stroke according to its pen style. Shared by the editor (live
 * and committed strokes) and the read-only viewer, so every style looks the
 * same for the author and their Santa. Strokes never listen to events: pointer
 * handling belongs to the stage, and that also lets the text tool place text
 * on top of a drawing.
 */
function StrokeShapeComponent({ stroke }: { stroke: CanvasStroke }) {
  const { points, color, width } = stroke;
  const kind: StrokeKind = stroke.tool === 'eraser' ? DEFAULT_STROKE_KIND : (stroke.kind ?? DEFAULT_STROKE_KIND);

  // Sparkles are a pure function of the stroke's own data. No memo: committed
  // strokes are skipped by React.memo anyway, and the live stroke changes on
  // every frame while drawing.
  const sparkles = kind === 'glitter' ? sampleSparkles(points, width, stroke.id) : [];

  const base = {
    points,
    stroke: color,
    strokeWidth: width,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    tension: 0.4,
    listening: false,
  };

  if (stroke.tool === 'eraser') {
    return <Line {...base} globalCompositeOperation="destination-out" />;
  }

  switch (kind) {
    case 'marker':
      // Translucent ink that darkens where it overlaps — a felt-tip look.
      return <Line {...base} lineCap="square" opacity={0.72} globalCompositeOperation="multiply" />;

    case 'highlighter':
      return (
        <Line
          {...base}
          lineCap="butt"
          tension={0.2}
          opacity={0.38}
          globalCompositeOperation="multiply"
        />
      );

    case 'crayon': {
      // Three slightly offset, dashed, translucent passes read as waxy grain.
      const magnitude = width * 0.18;
      const first = jitterOffset(stroke.id, 1, magnitude);
      const second = jitterOffset(stroke.id, 2, magnitude);
      return (
        <Group listening={false}>
          <Line {...base} opacity={0.55} />
          <Line
            {...base}
            x={first.dx}
            y={first.dy}
            strokeWidth={width * 0.75}
            opacity={0.35}
            dash={[width * 0.55, width * 0.3]}
          />
          <Line
            {...base}
            x={second.dx}
            y={second.dy}
            strokeWidth={width * 0.7}
            opacity={0.35}
            dash={[width * 0.4, width * 0.35]}
            dashOffset={width * 0.5}
          />
        </Group>
      );
    }

    case 'glossy':
      // Shadow below, colour in the middle, a bright specular line on top.
      return (
        <Group listening={false}>
          <Line {...base} stroke={darken(color, 0.35)} x={width * 0.12} y={width * 0.14} opacity={0.9} />
          <Line {...base} />
          <Line
            {...base}
            stroke={lighten(color, 0.7)}
            strokeWidth={width * 0.32}
            x={-width * 0.14}
            y={-width * 0.18}
            opacity={0.85}
          />
        </Group>
      );

    case 'neon':
      // Coloured glow around a near-white core — like the tube in the logo.
      return (
        <Group listening={false}>
          <Line
            {...base}
            opacity={0.9}
            shadowColor={color}
            shadowBlur={width * 2.2}
            shadowOpacity={1}
            shadowForStrokeEnabled
          />
          <Line {...base} stroke={lighten(color, 0.75)} strokeWidth={width * 0.42} />
        </Group>
      );

    case 'glitter': {
      const sparkleColor = lighten(color, 0.85);
      return (
        <Group listening={false}>
          <Line {...base} opacity={0.9} />
          {sparkles.map((sparkle, index) =>
            sparkle.shape === 'star' ? (
              <Star
                key={index}
                x={sparkle.x}
                y={sparkle.y}
                numPoints={4}
                innerRadius={sparkle.radius * 0.35}
                outerRadius={sparkle.radius}
                rotation={sparkle.rotation}
                fill={sparkleColor}
                opacity={sparkle.opacity}
                listening={false}
              />
            ) : (
              <Circle
                key={index}
                x={sparkle.x}
                y={sparkle.y}
                radius={sparkle.radius}
                fill={sparkleColor}
                opacity={sparkle.opacity}
                listening={false}
              />
            ),
          )}
        </Group>
      );
    }

    case 'pen':
    default:
      return <Line {...base} />;
  }
}

const StrokeShape = memo(DrawingShapeComponent);
export default StrokeShape;
