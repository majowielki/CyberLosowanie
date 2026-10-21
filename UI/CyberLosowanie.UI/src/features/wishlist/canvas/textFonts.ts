import { useEffect, useState } from 'react';
// Self-hosted text fonts (latin + latin-ext). The CSS only registers the
// @font-face rules — a file is downloaded the first time its font is used.
import '@fontsource/caveat';
import '@fontsource/patrick-hand';
import '@fontsource/berkshire-swash';
import '@fontsource/lobster';
import '@fontsource/great-vibes';
import '@fontsource/kaushan-script';
import '@fontsource/rubik-wet-paint';
import { TEXT_FONT_FAMILY, TEXT_FONTS } from './canvasConstants';
import type { CanvasItem, TextFontId } from './canvasDocument';

// Loading with Polish letters pulls in the latin-ext subset as well as latin.
const FONT_LOAD_SAMPLE = 'Aa ĄąĆćĘęŁłŃńÓóŚśŹźŻż';

/** CSS font-family list for a text item's font (fallback: the default font). */
export function cssFontFamily(fontFamily: TextFontId | undefined): string {
  const font = TEXT_FONTS.find((candidate) => candidate.id === fontFamily);
  return font ? `"${font.family}", ${TEXT_FONT_FAMILY}` : TEXT_FONT_FAMILY;
}

/**
 * Loads the fonts the given items use and returns a counter that changes once
 * they are ready. Canvas text is measured and drawn when rendered — the browser
 * does not redraw it when a web font arrives later — so the canvas re-measures
 * its texts whenever the counter changes.
 */
export function useTextFontsReady(items: CanvasItem[]): number {
  const [version, setVersion] = useState(0);
  const used = [
    ...new Set(
      items.flatMap((item) => (item.type === 'text' && item.fontFamily ? [item.fontFamily] : [])),
    ),
  ].sort();
  const usedKey = used.join('|');

  useEffect(() => {
    if (!usedKey || typeof document === 'undefined' || !document.fonts) {
      return;
    }
    const pending = usedKey
      .split('|')
      .map((id) => `48px ${cssFontFamily(id as TextFontId)}`)
      .filter((font) => !document.fonts.check(font, FONT_LOAD_SAMPLE));
    if (pending.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.allSettled(pending.map((font) => document.fonts.load(font, FONT_LOAD_SAMPLE))).then(
      () => {
        if (!cancelled) {
          setVersion((current) => current + 1);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [usedKey]);

  return version;
}
