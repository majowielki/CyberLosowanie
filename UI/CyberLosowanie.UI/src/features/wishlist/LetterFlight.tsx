import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import skyTall from '@/assets/cinematic/letter-sky-tall.webp';
import skyWide from '@/assets/cinematic/letter-sky-wide.webp';
import waxSeal from '@/assets/cinematic/wax-seal.webp';

// The CSS timeline in index.css (.lf-*) ends at ~4.6 s.
const DURATION_MS = 4700;
const OUT_MS = 500;
const SKIP_OUT_MS = 250;

const INK = '#6b4a2b';

interface LetterFlightProps {
  /** The user's first page (see captureLetterThumbnail); null shows a plain paper. */
  thumbnail: string | null;
  onClose: () => void;
}

/**
 * After the first "send letter to Santa": the user's own first page folds into
 * an envelope, gets a wax seal and flies off over the night roofs to a star.
 * Drawn in HTML/SVG in the stickers' storybook style; the sky is generated
 * (Higgsfield, no text). Skip with the button, Escape or a click.
 */
function LetterFlight({ thumbnail, onClose }: LetterFlightProps) {
  const { t } = useTranslation();
  const [leaving, setLeaving] = useState<number | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const leave = useCallback((ms: number) => {
    setLeaving((current) => {
      if (current === null) {
        window.setTimeout(() => onCloseRef.current(), ms);
        return ms;
      }
      return current;
    });
  }, []);

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
    const id = window.setTimeout(() => leave(OUT_MS), DURATION_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        leave(SKIP_OUT_MS);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [leave]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wishlist.flight.label')}
      onClick={() => leave(SKIP_OUT_MS)}
      className={cn(
        'fixed inset-0 z-[70] overflow-hidden bg-pine-950 transition-opacity ease-out animate-in fade-in duration-500',
        leaving !== null && 'pointer-events-none opacity-0',
      )}
      style={{
        transitionDuration: `${leaving ?? OUT_MS}ms`,
        // Where the envelope flies to — the star sits at the same spot.
        ['--lf-to-x' as string]: 'min(30vw, 24rem)',
        ['--lf-to-y' as string]: '-42vh',
      }}
    >
      <p className="sr-only" role="status">{t('wishlist.flight.status')}</p>

      <picture aria-hidden>
        <source media="(min-aspect-ratio: 1/1)" srcSet={skyWide} />
        <img src={skyTall} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      </picture>
      {/* Falling snow over the sky, same as the app's backdrop. */}
      <div aria-hidden className="snow-layer snow-layer--mid" />
      <div aria-hidden className="snow-layer snow-layer--near" />

      {/* The star the letter flies to. */}
      <div
        aria-hidden
        className="lf-star absolute h-24 w-24 rounded-full"
        style={{
          left: 'calc(50% + var(--lf-to-x))',
          top: 'calc(55% + var(--lf-to-y))',
          background: 'radial-gradient(closest-side, hsl(45 100% 92%), hsl(var(--gold) / 0.7) 35%, transparent 70%)',
        }}
      />

      <div className="absolute left-1/2 top-[55%] w-[min(78vw,22rem)] -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <div className="lf-envelope relative aspect-[3/2] w-full [perspective:900px]">
          {/* Back of the envelope. */}
          <svg viewBox="0 0 300 200" className="absolute inset-0 z-[1] h-full w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]">
            <rect x="2" y="2" width="296" height="196" rx="10" fill="#e8d3ae" stroke={INK} strokeWidth="3" />
          </svg>

          {/* The letter: the user's first page (or a blank sheet with lines). */}
          <div className="lf-paper absolute bottom-[5%] left-[9%] z-[2] aspect-[1/1.414] w-[82%] overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-black/10">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col gap-[7%] p-[10%] pt-[16%]">
                {[0, 1, 2, 3, 4, 5].map((line) => (
                  <span key={line} className="h-[2px] rounded bg-primary/30" style={{ width: `${90 - line * 9}%` }} />
                ))}
              </div>
            )}
          </div>

          {/* Front pocket. */}
          <svg viewBox="0 0 300 200" className="absolute inset-0 z-[4] h-full w-full">
            <path
              d="M2 72 L150 132 L298 72 L298 188 Q298 198 288 198 L12 198 Q2 198 2 188 Z"
              fill="#f5e8cf"
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M2 196 L118 120 M298 196 L182 120" stroke={INK} strokeWidth="2" opacity="0.35" fill="none" />
          </svg>

          {/* Flap: open behind the letter, then closes over it. */}
          <svg viewBox="0 0 300 200" className="lf-flap absolute inset-0 h-full w-full">
            <path
              d="M4 6 Q4 2 10 3 L150 3 L290 3 Q296 2 296 6 L160 116 Q150 124 140 116 Z"
              fill="#f1e0c0"
              stroke={INK}
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>

          <img
            src={waxSeal}
            alt=""
            className="lf-seal absolute left-1/2 top-[58%] z-[7] w-[22%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"
          />
        </div>
      </div>

      <p className="lf-caption absolute inset-x-0 bottom-[18%] text-center font-display text-4xl text-cream drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-5xl">
        {t('wishlist.flight.caption')}
      </p>

      <div
        className="absolute inset-x-0 bottom-0 flex justify-center p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <Button ref={skipRef} type="button" variant="glass" onClick={() => leave(SKIP_OUT_MS)}>
          {t('wishlist.flight.skip')}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The short version for "tell Santa about changes": a small sealed envelope
 * hops off the button and flies away. Decorative only; it removes itself.
 */
export function NotifyFlight({ from, onDone }: { from: DOMRect; onDone: () => void }) {
  return createPortal(
    <img
      aria-hidden
      alt=""
      src={waxSeal}
      onAnimationEnd={onDone}
      className="lf-notify pointer-events-none fixed z-[70] w-10 drop-shadow-[0_0_10px_hsl(var(--gold)/0.8)]"
      style={{ left: from.left + from.width / 2, top: from.top + from.height / 2 }}
    />,
    document.body,
  );
}

export default LetterFlight;
