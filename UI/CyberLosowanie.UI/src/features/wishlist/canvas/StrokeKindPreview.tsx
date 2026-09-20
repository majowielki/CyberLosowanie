import { StrokeKind } from './canvasDocument';
import { darken, lighten } from './strokeStyles';

// A short wave; every style below draws this same path so the previews compare.
const WAVE = 'M3 13 C 9 2, 15 22, 22 11 S 30 4, 35 9';

/**
 * Thumbnail of a pen style for the toolbar: an SVG approximation of what
 * StrokeShape renders on the canvas, in the currently selected colour.
 */
function StrokeKindPreview({ kind, color }: { kind: StrokeKind; color: string }) {
  const common = { d: WAVE, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <svg viewBox="0 0 38 22" className="h-5 w-9" aria-hidden focusable="false">
      {kind === 'pen' && <path {...common} stroke={color} strokeWidth={4} />}

      {kind === 'marker' && (
        <>
          <path {...common} stroke={color} strokeWidth={6} strokeLinecap="square" opacity={0.7} />
          {/* Overlap patch: shows the ink darkening where strokes cross. */}
          <path d="M14 4 L 24 18" stroke={color} strokeWidth={6} strokeLinecap="square" opacity={0.7} />
        </>
      )}

      {kind === 'highlighter' && (
        <path {...common} stroke={color} strokeWidth={9} strokeLinecap="butt" opacity={0.4} />
      )}

      {kind === 'crayon' && (
        <>
          <path {...common} stroke={color} strokeWidth={4} opacity={0.55} />
          <path {...common} stroke={color} strokeWidth={3} opacity={0.4} strokeDasharray="2 1.5" transform="translate(0.6 -0.8)" />
          <path {...common} stroke={color} strokeWidth={3} opacity={0.4} strokeDasharray="1.5 1.5" transform="translate(-0.6 0.9)" />
        </>
      )}

      {kind === 'glossy' && (
        <>
          <path {...common} stroke={darken(color, 0.35)} strokeWidth={5} transform="translate(0.6 0.8)" />
          <path {...common} stroke={color} strokeWidth={5} />
          <path {...common} stroke={lighten(color, 0.7)} strokeWidth={1.6} transform="translate(-0.7 -1)" />
        </>
      )}

      {kind === 'neon' && (
        <>
          <path {...common} stroke={color} strokeWidth={9} opacity={0.3} />
          <path {...common} stroke={color} strokeWidth={5} opacity={0.8} />
          <path {...common} stroke={lighten(color, 0.75)} strokeWidth={1.8} />
        </>
      )}

      {kind === 'glitter' && (
        <>
          <path {...common} stroke={color} strokeWidth={5} opacity={0.9} />
          {[
            [7, 9],
            [13, 14],
            [20, 8],
            [26, 6],
            [31, 10],
          ].map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={index % 2 === 0 ? 1.1 : 0.8} fill={lighten(color, 0.85)} />
          ))}
        </>
      )}
    </svg>
  );
}

export default StrokeKindPreview;
