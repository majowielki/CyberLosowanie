import skyTall from '@/assets/cinematic/letter-sky-tall.webp';
import skyWide from '@/assets/cinematic/letter-sky-wide.webp';
import skyTallLoop from '@/assets/cinematic/letter-sky-tall.mp4';
import skyWideLoop from '@/assets/cinematic/letter-sky-wide.mp4';

/**
 * The night sky behind the letter flight: a still (always shown first) and a
 * seamless loop of the same picture (Kling first frame = last frame: chimney
 * smoke drifts, stars twinkle). Portrait on phones, landscape on wide screens.
 */
export const LETTER_SKY = { skyTall, skyWide } as const;

const WIDE_QUERY = '(min-aspect-ratio: 1/1)';

export const letterSkyLoopSrc = (): string =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches
    ? skyWideLoop
    : skyTallLoop;

export const LETTER_SKY_WIDE_QUERY = WIDE_QUERY;
