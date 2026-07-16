import { useEffect, useState } from 'react';
import { config, debugLog } from '@/shared/config';

/**
 * Loads a wishlist image from the private container through the authorized
 * proxy endpoint. A plain <img src> / Konva URL cannot be used — the request
 * needs the JWT header — so the blob is fetched manually (the one deliberate
 * exception to the "RTK Query only" rule, designed in doc 5.1) and handed to
 * Konva as an HTMLImageElement backed by an object URL, revoked on cleanup.
 */
export function useAuthorizedImage(path: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!path) {
      setImage(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const token = localStorage.getItem('token');

    fetch(`${config.API_BASE_URL}${config.ENDPOINTS.WISHLIST.IMAGES}/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Wishlist image request failed with status ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        const element = new window.Image();
        element.onload = () => {
          if (!cancelled) {
            setImage(element);
          }
        };
        element.src = objectUrl;
      })
      .catch((error) => {
        debugLog('Wishlist image load failed:', path, error);
        if (!cancelled) {
          setImage(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  return image;
}
