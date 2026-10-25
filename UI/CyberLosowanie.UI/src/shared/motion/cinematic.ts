/**
 * The "cinematic" effects (generated films, overlays, sound) — every one of
 * them is switched here and nowhere else. Set a flag to false to turn the
 * effect off; the app then falls back to its plain behaviour (the old reveal,
 * a toast, no sound).
 *
 * All effects also stay off under prefers-reduced-motion, and the films stay
 * off with Data Saver on.
 */
export const CINEMATIC = {
  /** Gift-opening film between the boxes page and the final page. */
  giftFilm: true,
  /** The clicked box shakes while the draw request is in flight (instead of a loading panel). */
  giftShake: true,
  /** Quiet unwrapping sound under the gift film (muted with a switch, remembered). */
  giftSound: true,
  /** Letter folds into an envelope and flies into the night sky after the first send. */
  letterFlight: true,
  /** Small envelope flying off the button after "tell Santa about changes". */
  letterNotifyFlight: true,
} as const;

export type CinematicEffect = keyof typeof CINEMATIC;

const matches = (query: string): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches;

export const prefersReducedMotion = (): boolean => matches('(prefers-reduced-motion: reduce)');

/** Data Saver / "lite mode" (Chromium only; elsewhere unknown = false). */
export const prefersSavedData = (): boolean => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
};

/** True when the effect is on and the visitor has not asked for less motion. */
export const isEffectEnabled = (effect: CinematicEffect): boolean =>
  CINEMATIC[effect] && !prefersReducedMotion();

/** Films additionally need a device that can play video and no Data Saver. */
export const canPlayFilm = (effect: CinematicEffect): boolean =>
  isEffectEnabled(effect) &&
  !prefersSavedData() &&
  typeof document !== 'undefined' &&
  typeof document.createElement('video').canPlayType === 'function' &&
  document.createElement('video').canPlayType('video/mp4') !== '';

const SOUND_KEY = 'cinematic:sound';

/** The visitor's sound switch (default on). Storage may be blocked — never throw. */
export const isSoundOn = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setSoundOn = (on: boolean): void => {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice simply lasts for this page view.
  }
};

/**
 * Warms the HTTP cache with a film while the page is idle, so it starts at
 * once after the click. Best effort: errors are ignored.
 */
export const prefetchWhenIdle = (urls: string[]): (() => void) => {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return () => {};
  }
  const run = () => {
    urls.forEach((url) => {
      fetch(url, { priority: 'low' } as RequestInit).catch(() => {});
    });
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (idle) {
    const id = idle(run, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(run, 1500);
  return () => window.clearTimeout(id);
};
