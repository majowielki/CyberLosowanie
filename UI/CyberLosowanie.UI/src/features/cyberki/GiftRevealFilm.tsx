import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { isSoundOn, setSoundOn } from '@/shared/motion/cinematic';
import { playSound, stopSound } from '@/shared/motion/sound';
import { GIFT_FILM, giftFilmSrc } from './giftFilm';

export interface BoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface GiftRevealFilmProps {
  /** The clicked box on the boxes page (viewport px): the film lifts off from there. */
  fromRect?: BoxRect | null;
  /** The overlay starts fading out — time for the page's own reveal. */
  onReveal: () => void;
  /** The overlay is gone. */
  onClose: () => void;
}

type Phase = 'intro' | 'play' | 'bloom' | 'out';

const INTRO_MS = 520;
const BLOOM_MS = 650;
const OUT_MS = 650;
const SKIP_OUT_MS = 320;
// The film must actually be playing by then, or the page is shown without it.
const START_TIMEOUT_MS = 2500;

/**
 * Full-screen gift-opening film, played once right after a successful draw.
 * The clip is shared by all 12 results and shows only the box: the portrait
 * and the name are always the page's own HTML underneath. The film ends on
 * the open box pouring out golden light; the code then pushes into that light
 * (a gold bloom) and fades it away onto the final page's halo.
 *
 * Every failure path (autoplay refused, slow network, decode error) skips
 * straight to the page. Skip with the button, Escape or a click anywhere.
 */
function GiftRevealFilm({ fromRect, onReveal, onClose }: GiftRevealFilmProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('intro');
  const [soundOn, setSoundOnState] = useState(isSoundOn);
  const [outMs, setOutMs] = useState(OUT_MS);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const finishedRef = useRef(false);
  const [src] = useState(giftFilmSrc);

  // The parent re-renders while the film runs (router state, data); keep the
  // callbacks in refs so `finish` — and the effects using it — stay stable.
  const onRevealRef = useRef(onReveal);
  const onCloseRef = useRef(onClose);
  onRevealRef.current = onReveal;
  onCloseRef.current = onClose;

  const finish = useCallback((fadeMs: number) => {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    stopSound(GIFT_FILM.sound);
    setOutMs(fadeMs);
    setPhase('out');
    onRevealRef.current();
    window.setTimeout(() => onCloseRef.current(), fadeMs);
  }, []);

  const skip = useCallback(() => finish(SKIP_OUT_MS), [finish]);

  // Intro: the box lifts off from where it was clicked into the centre of the screen.
  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
    const stage = stageRef.current;
    if (fromRect && stage && typeof stage.animate === 'function') {
      const target = stage.getBoundingClientRect();
      // In the film the box spans 62.5% of the frame, centred at 54.7% height;
      // in the grid it spans ~72% of its square, centred at ~55%.
      const scale = (fromRect.width * 0.72) / (target.width * 0.625);
      const dx = fromRect.left + fromRect.width / 2 - (target.left + target.width / 2);
      const dy = fromRect.top + fromRect.height * 0.55 - (target.top + target.height * 0.547);
      stage.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.6 },
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        ],
        { duration: INTRO_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
    const id = window.setTimeout(() => setPhase((p) => (p === 'intro' ? 'play' : p)), INTRO_MS);
    return () => window.clearTimeout(id);
    // Runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play: start the film (and the quiet sound); anything that goes wrong shows the page.
  useEffect(() => {
    if (phase !== 'play') {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      finish(0);
      return;
    }
    // Asks the element itself, so it cannot miss a `playing` event.
    const watchdog = window.setTimeout(() => {
      if (video.paused || video.currentTime === 0) {
        finish(SKIP_OUT_MS);
      }
    }, START_TIMEOUT_MS);
    try {
      video.playbackRate = GIFT_FILM.playbackRate;
      const played = video.play();
      if (played && typeof played.catch === 'function') {
        played.then(() => playSound(GIFT_FILM.sound, GIFT_FILM.volume)).catch(() => finish(0));
      }
    } catch {
      finish(0);
    }
    return () => window.clearTimeout(watchdog);
  }, [phase, finish]);

  // Bloom: push into the light, then fade away onto the page.
  useEffect(() => {
    if (phase !== 'bloom') {
      return;
    }
    const id = window.setTimeout(() => finish(OUT_MS), BLOOM_MS);
    return () => window.clearTimeout(id);
  }, [phase, finish]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  useEffect(() => () => stopSound(GIFT_FILM.sound), []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundOnState(next);
    if (next && phase === 'play') {
      playSound(GIFT_FILM.sound, GIFT_FILM.volume);
    } else if (!next) {
      stopSound(GIFT_FILM.sound);
    }
  };

  // Portalled to <body>: an animated page wrapper keeps a CSS transform, which
  // would make "fixed" relative to it instead of the screen (buttons cut off
  // below the fold on tall phone pages).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('cyberki.film.label')}
      onClick={skip}
      className={cn(
        // Flex (not grid) centres the stage even when it is wider than a phone screen.
        'fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-pine-950 transition-opacity ease-out',
        phase === 'out' ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{
        transitionDuration: `${outMs}ms`,
        // Same night as the page behind it: a dim pine glow around the film.
        backgroundImage:
          'radial-gradient(closest-side at 50% 50%, hsl(var(--pine-800) / 0.55), transparent 100%)',
      }}
    >
      <p className="sr-only" role="status">{t('cyberki.film.status')}</p>

      <div
        ref={stageRef}
        className="relative aspect-square w-[min(135vw,82vh,52rem)] shrink-0"
        style={{
          // Feather the square into the page so no rectangle shows.
          WebkitMaskImage: 'radial-gradient(closest-side, #000 52%, rgb(0 0 0 / 0.55) 74%, transparent 100%)',
          maskImage: 'radial-gradient(closest-side, #000 52%, rgb(0 0 0 / 0.55) 74%, transparent 100%)',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={GIFT_FILM.poster}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          onEnded={() => setPhase((p) => (p === 'play' ? 'bloom' : p))}
          onError={() => finish(0)}
          className={cn(
            'h-full w-full object-cover transition-transform ease-in',
            phase === 'bloom' || phase === 'out' ? 'scale-[1.45]' : 'scale-100',
          )}
          style={{ transformOrigin: '52% 40%', transitionDuration: `${BLOOM_MS + OUT_MS}ms` }}
        />
      </div>

      {/* The bloom: light from the box fills the screen, then fades into the page's halo. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity ease-in',
          phase === 'bloom' || phase === 'out' ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transitionDuration: `${BLOOM_MS}ms`,
          background:
            'radial-gradient(circle at 50% 42%, hsl(45 100% 92%) 0%, hsl(var(--gold) / 0.95) 22%, hsl(var(--gold) / 0.55) 48%, hsl(var(--pine-950) / 0.0) 80%)',
        }}
      />

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-opacity duration-300',
          phase === 'play' || phase === 'intro' ? 'opacity-100' : 'opacity-0',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="glass"
          size="icon"
          aria-pressed={soundOn}
          aria-label={soundOn ? t('cyberki.film.soundOff') : t('cyberki.film.soundOn')}
          onClick={toggleSound}
        >
          {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
        </Button>
        <Button ref={skipRef} type="button" variant="glass" onClick={skip}>
          {t('cyberki.film.skip')}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

export default GiftRevealFilm;
