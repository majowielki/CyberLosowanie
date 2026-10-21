import { useCallback, useEffect, useRef } from 'react';

const TRAP_KEY = '__backTrap';

// Mounted trap owners. React StrictMode mounts, unmounts and remounts effects;
// the count lets the deferred cleanup tell a real unmount from that replay.
let trapOwners = 0;

const isOnTrapEntry = (): boolean =>
  Boolean((window.history.state as Record<string, unknown> | null)?.[TRAP_KEY]);

const pushTrapEntry = () =>
  window.history.pushState({ ...(window.history.state ?? {}), [TRAP_KEY]: true }, '');

/**
 * Turns the system Back gesture (Android Back button, swipe) into a callback
 * while `enabled`: one extra history entry with the same URL sits on top of
 * the stack, a Back press pops it, the entry is pushed again and `onBack`
 * decides what Back means (close a panel, ask about unsaved changes, leave).
 *
 * The entry copies the router's history state, so React Router sees the pop as
 * a same-location POP and neither navigates nor triggers its blockers.
 *
 * `release()` stops intercepting before the caller leaves on purpose and
 * reports whether the trap entry is still on top (one more step to go back).
 */
export function useHistoryBackTrap(enabled: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const releasedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    releasedRef.current = false;
    trapOwners += 1;
    if (!isOnTrapEntry()) {
      pushTrapEntry();
    }
    const handlePopState = () => {
      if (releasedRef.current || isOnTrapEntry()) {
        return;
      }
      pushTrapEntry();
      onBackRef.current();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      trapOwners -= 1;
      // Deferred, so a StrictMode remount keeps the entry instead of popping it.
      setTimeout(() => {
        if (trapOwners === 0 && isOnTrapEntry()) {
          window.history.back();
        }
      }, 0);
    };
  }, [enabled]);

  return useCallback(() => {
    releasedRef.current = true;
    return isOnTrapEntry();
  }, []);
}
