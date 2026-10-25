import { isSoundOn } from './cinematic';

// One element per sound file, reused, so a sound unlocked by a tap can be
// played later without another gesture (iOS only allows media started inside
// a gesture; an element that played once stays allowed).
const elements = new Map<string, HTMLAudioElement>();

const elementFor = (src: string): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') {
    return null;
  }
  let element = elements.get(src);
  if (!element) {
    element = new Audio(src);
    element.preload = 'auto';
    elements.set(src, element);
  }
  return element;
};

/**
 * Call inside the click/tap handler that will later lead to the sound: plays
 * the file silently for an instant, which unlocks it on mobile browsers.
 */
export const primeSound = (src: string): void => {
  if (!isSoundOn()) {
    return;
  }
  const element = elementFor(src);
  if (!element) {
    return;
  }
  try {
    element.muted = true;
    element
      .play()
      .then(() => {
        element.pause();
        element.currentTime = 0;
        element.muted = false;
      })
      .catch(() => {
        element.muted = false;
      });
  } catch {
    // jsdom and old browsers: no media playback — stay silent.
  }
};

/** Plays the sound quietly if the visitor's switch is on. Failures are silent. */
export const playSound = (src: string, volume = 0.4): void => {
  if (!isSoundOn()) {
    return;
  }
  const element = elementFor(src);
  if (!element) {
    return;
  }
  try {
    element.muted = false;
    element.volume = volume;
    element.currentTime = 0;
    element.play().catch(() => {});
  } catch {
    // Ignore: sound is decoration.
  }
};

export const stopSound = (src: string): void => {
  const element = elements.get(src);
  if (!element) {
    return;
  }
  try {
    element.pause();
  } catch {
    // Ignore.
  }
};
