import film720 from '@/assets/cinematic/gift-open-720.mp4';
import film1080 from '@/assets/cinematic/gift-open-1080.mp4';
import poster from '@/assets/cinematic/gift-open-poster.webp';
import sound from '@/assets/cinematic/gift-open.mp3';

/**
 * The gift-opening film (Kling O3 first/last frame: the app's own closed box →
 * the open box pouring out light). Square, muted, no people, no text — the
 * same clip for every result.
 */
export const GIFT_FILM = {
  small: film720,
  large: film1080,
  poster,
  sound,
  volume: 0.35,
  playbackRate: 1.1,
} as const;

/** 720 px on phones, 1080 px from tablets up. */
export const giftFilmSrc = (): string =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(min-width: 768px) and (min-height: 700px)').matches
    ? GIFT_FILM.large
    : GIFT_FILM.small;

/** Router state the boxes page hands to /final-page after a successful draw. */
export interface JustDrawnState {
  justDrawn: true;
  boxRect?: { left: number; top: number; width: number; height: number } | null;
}

export const isJustDrawnState = (state: unknown): state is JustDrawnState =>
  typeof state === 'object' && state !== null && (state as { justDrawn?: unknown }).justDrawn === true;
