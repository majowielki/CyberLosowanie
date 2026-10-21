import { useEffect, useState } from 'react';
import { debugLog } from '@/shared/config';

// Loaded sticker artwork by URL. Stickers are bundled public assets (no auth
// header needed, unlike useAuthorizedImage), so one element per file can be
// shared by every sticker on every page for the app's lifetime.
const loadedImages = new Map<string, HTMLImageElement>();

/** Loads a bundled sticker file for Konva; null until it has loaded. */
export function useStickerImage(src: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(
    () => (src && loadedImages.get(src)) || null,
  );

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const cached = loadedImages.get(src);
    if (cached) {
      setImage(cached);
      return;
    }

    let cancelled = false;
    const element = new window.Image();
    element.onload = () => {
      loadedImages.set(src, element);
      if (!cancelled) {
        setImage(element);
      }
    };
    element.onerror = () => debugLog('Sticker image load failed:', src);
    element.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}
