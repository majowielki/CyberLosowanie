import { useId } from 'react';
import { PagePattern } from './canvasDocument';
import { patternInkColor } from './pagePatterns';
import { darken, lighten } from './strokeStyles';

/**
 * Thumbnail of a background pattern for the toolbar, on the current page
 * colour: a small SVG sketch of what PagePatternLayer draws on the canvas.
 */
function PagePatternPreview({ pattern, background }: { pattern: PagePattern | undefined; background: string }) {
  // Gradient ids must be unique per instance (several previews share a page).
  const id = useId();
  const ink = patternInkColor(background);

  return (
    <svg viewBox="0 0 40 28" className="h-7 w-10 rounded border border-gray-300" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(background, 0.28)} />
          <stop offset="0.55" stopColor={background} />
          <stop offset="1" stopColor={darken(background, 0.14)} />
        </linearGradient>
        <radialGradient id={`${id}-gloss`} cx="0.2" cy="0.1" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-dots`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill={ink} />
        </pattern>
        <pattern id={`${id}-grid`} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M6 0 H0 V6" fill="none" stroke={ink} strokeWidth="0.6" />
        </pattern>
        <pattern id={`${id}-lines`} width="8" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 5.5 H8" stroke={ink} strokeWidth="0.8" />
        </pattern>
        <pattern id={`${id}-stripes`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="8" fill={ink} />
        </pattern>
        <pattern id={`${id}-checker`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={ink} />
          <rect x="4" y="4" width="4" height="4" fill={ink} />
        </pattern>
        <pattern id={`${id}-paper`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1.5" r="0.45" fill={ink} opacity="0.5" />
          <circle cx="3.5" cy="3.8" r="0.4" fill={ink} opacity="0.4" />
        </pattern>
      </defs>

      <rect width="40" height="28" fill={pattern === 'satin' ? `url(#${id}-satin)` : background} />

      {(pattern === 'dots' || pattern === 'grid' || pattern === 'lines' || pattern === 'stripes' ||
        pattern === 'checker' || pattern === 'paper') && (
        <rect width="40" height="28" fill={`url(#${id}-${pattern})`} />
      )}

      {pattern === 'glossy' && <rect width="40" height="28" fill={`url(#${id}-gloss)`} />}

      {pattern === 'snowflakes' &&
        [
          [9, 9, 4],
          [24, 18, 5],
          [32, 7, 3],
        ].map(([x, y, r], index) => (
          <g key={index} stroke={ink} strokeWidth="0.9" transform={`translate(${x} ${y})`}>
            <path d={`M0 ${-r} V${r} M${-r} 0 H${r} M${-r * 0.7} ${-r * 0.7} L${r * 0.7} ${r * 0.7} M${r * 0.7} ${-r * 0.7} L${-r * 0.7} ${r * 0.7}`} />
          </g>
        ))}

      {pattern === 'stars' &&
        [
          [7, 8, 2.2],
          [18, 20, 1.6],
          [26, 6, 2.8],
          [34, 17, 1.8],
          [13, 24, 1.2],
        ].map(([x, y, r], index) => (
          <path
            key={index}
            fill={ink}
            d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`}
          />
        ))}
    </svg>
  );
}

export default PagePatternPreview;
