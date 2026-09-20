import { memo } from 'react';
import { Circle, Group, Line, Rect, Star } from 'react-konva';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './canvasConstants';
import { PagePattern } from './canvasDocument';
import { patternInkColor, scatterPoints } from './pagePatterns';
import { darken, lighten } from './strokeStyles';

interface PagePatternLayerProps {
  pattern: PagePattern | undefined;
  background: string;
  /** Page id — seeds the scattered patterns so every viewer sees the same page. */
  seed: string;
}

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

/**
 * Draws a page's background pattern over its colour. Lives in the background
 * layer under the strokes, never listens to pointer events (the plain
 * background rect behind it stays the "background" hit target).
 */
function PagePatternLayerComponent({ pattern, background, seed }: PagePatternLayerProps) {
  if (!pattern) {
    return null;
  }
  const ink = patternInkColor(background);

  switch (pattern) {
    case 'dots': {
      const step = 48;
      const dots: JSX.Element[] = [];
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          dots.push(<Circle key={`${x}-${y}`} x={x} y={y} radius={4} fill={ink} />);
        }
      }
      return <Group listening={false}>{dots}</Group>;
    }

    case 'grid': {
      const step = 40;
      const lines: JSX.Element[] = [];
      for (let x = step; x < W; x += step) {
        lines.push(<Line key={`v${x}`} points={[x, 0, x, H]} stroke={ink} strokeWidth={1.5} />);
      }
      for (let y = step; y < H; y += step) {
        lines.push(<Line key={`h${y}`} points={[0, y, W, y]} stroke={ink} strokeWidth={1.5} />);
      }
      return <Group listening={false}>{lines}</Group>;
    }

    case 'lines': {
      const step = 56;
      const lines: JSX.Element[] = [];
      for (let y = step; y < H; y += step) {
        lines.push(<Line key={y} points={[0, y, W, y]} stroke={ink} strokeWidth={2} />);
      }
      return <Group listening={false}>{lines}</Group>;
    }

    case 'stripes': {
      // Diagonal candy-cane stripes, clipped to the page.
      const spacing = 96;
      const lines: JSX.Element[] = [];
      for (let offset = -H; offset < W + H; offset += spacing) {
        lines.push(
          <Line key={offset} points={[offset, 0, offset + H, H]} stroke={ink} strokeWidth={28} />,
        );
      }
      return (
        <Group listening={false} clipX={0} clipY={0} clipWidth={W} clipHeight={H}>
          {lines}
        </Group>
      );
    }

    case 'checker': {
      const size = 60;
      const squares: JSX.Element[] = [];
      for (let row = 0; row * size < H; row++) {
        for (let col = 0; col * size < W; col++) {
          if ((row + col) % 2 === 0) {
            squares.push(
              <Rect key={`${row}-${col}`} x={col * size} y={row * size} width={size} height={size} fill={ink} />,
            );
          }
        }
      }
      return (
        <Group listening={false} clipX={0} clipY={0} clipWidth={W} clipHeight={H}>
          {squares}
        </Group>
      );
    }

    case 'snowflakes':
      return (
        <Group listening={false}>
          {scatterPoints(`${seed}:snow`, 44, W, H).map((point, index) => (
            <Snowflake
              key={index}
              x={point.x}
              y={point.y}
              radius={14 + point.size * 24}
              rotation={point.rotation}
              color={ink}
              opacity={point.opacity}
            />
          ))}
        </Group>
      );

    case 'stars':
      return (
        <Group listening={false}>
          {scatterPoints(`${seed}:stars`, 90, W, H).map((point, index) => (
            <Star
              key={index}
              x={point.x}
              y={point.y}
              numPoints={4}
              innerRadius={2 + point.size * 3}
              outerRadius={7 + point.size * 12}
              rotation={point.rotation}
              fill={ink}
              opacity={point.opacity}
            />
          ))}
        </Group>
      );

    case 'satin':
      // Soft top-to-bottom shading of the page colour.
      return (
        <Rect
          listening={false}
          x={0}
          y={0}
          width={W}
          height={H}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: 0, y: H }}
          fillLinearGradientColorStops={[0, lighten(background, 0.28), 0.55, background, 1, darken(background, 0.14)]}
        />
      );

    case 'glossy':
      // A light sheen from the top-left corner and a shadow towards the bottom-right.
      return (
        <Group listening={false}>
          <Rect
            x={0}
            y={0}
            width={W}
            height={H}
            fillRadialGradientStartPoint={{ x: W * 0.2, y: H * 0.1 }}
            fillRadialGradientEndPoint={{ x: W * 0.2, y: H * 0.1 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={H * 0.9}
            fillRadialGradientColorStops={[0, 'rgba(255,255,255,0.55)', 0.5, 'rgba(255,255,255,0.12)', 1, 'rgba(255,255,255,0)']}
          />
          <Rect
            x={0}
            y={0}
            width={W}
            height={H}
            fillRadialGradientStartPoint={{ x: W * 0.9, y: H * 0.95 }}
            fillRadialGradientEndPoint={{ x: W * 0.9, y: H * 0.95 }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={H * 0.8}
            fillRadialGradientColorStops={[0, 'rgba(0,0,0,0.16)', 1, 'rgba(0,0,0,0)']}
          />
        </Group>
      );

    case 'paper':
      // Fine deterministic grain, like uncoated paper.
      return (
        <Group listening={false}>
          {scatterPoints(`${seed}:paper`, 1800, W, H).map((point, index) => (
            <Circle
              key={index}
              x={point.x}
              y={point.y}
              radius={0.8 + point.size * 1.2}
              fill={ink}
              opacity={point.opacity * 0.45}
            />
          ))}
        </Group>
      );

    default:
      return null;
  }
}

/** Six arms with a pair of branches near each tip — reads as a snowflake, not a star. */
function Snowflake({
  x,
  y,
  radius,
  rotation,
  color,
  opacity,
}: {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  color: string;
  opacity: number;
}) {
  const strokeWidth = Math.max(1.5, radius * 0.09);
  const branchAt = radius * 0.62;
  const branchLength = radius * 0.3;
  const arms = [0, 60, 120, 180, 240, 300];
  return (
    <Group x={x} y={y} rotation={rotation} opacity={opacity} listening={false}>
      {arms.map((angle) => (
        <Group key={angle} rotation={angle}>
          <Line points={[0, 0, 0, -radius]} stroke={color} strokeWidth={strokeWidth} lineCap="round" />
          <Line
            points={[0, -branchAt, branchLength * 0.7, -branchAt - branchLength * 0.7]}
            stroke={color}
            strokeWidth={strokeWidth}
            lineCap="round"
          />
          <Line
            points={[0, -branchAt, -branchLength * 0.7, -branchAt - branchLength * 0.7]}
            stroke={color}
            strokeWidth={strokeWidth}
            lineCap="round"
          />
        </Group>
      ))}
    </Group>
  );
}

const PagePatternLayer = memo(PagePatternLayerComponent);
export default PagePatternLayer;
