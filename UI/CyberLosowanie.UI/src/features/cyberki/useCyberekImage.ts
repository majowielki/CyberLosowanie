import { useEffect, useState } from 'react';
import { config, debugLog } from '@/shared/config';
import { cyberekImageKind } from '@/types';

// Object URLs by request URL, shared by every portrait on every page. The
// portraits are small (~100 KB, 36 in total), identical for all users and change
// only when the upload script is re-run, so they are kept for the whole session:
// going back and forth between pages shows them instantly, without a flash.
const objectUrlCache = new Map<string, Promise<string>>();

const imageUrl = (cyberekId: number, kind: cyberekImageKind) =>
  `${config.API_BASE_URL}${config.ENDPOINTS.CYBER_LOSOWANIE.BASE}/${cyberekId}/images/${kind}`;

function loadObjectUrl(url: string): Promise<string> {
  const cached = objectUrlCache.get(url);
  if (cached) {
    return cached;
  }

  const token = localStorage.getItem('token');
  const request = fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Cyberek image request failed with status ${response.status}`);
      }
      return response.blob();
    })
    .then((blob) => URL.createObjectURL(blob));

  // A failed request is forgotten, so the next mount can retry it.
  request.catch(() => objectUrlCache.delete(url));
  objectUrlCache.set(url, request);
  return request;
}

export type CyberekImageState =
  | { status: 'loading' }
  | { status: 'loaded'; src: string }
  | { status: 'error' };

/**
 * Loads a cyberek portrait from the private container through the authorized
 * endpoint. Like wishlist images (useAuthorizedImage), a plain <img src> cannot
 * send the JWT header, so the image is fetched manually and shown through an
 * object URL.
 */
export function useCyberekImage(cyberekId: number | null | undefined, kind: cyberekImageKind): CyberekImageState {
  const url = cyberekId == null ? null : imageUrl(cyberekId, kind);
  const [state, setState] = useState<{ url: string | null; image: CyberekImageState }>({
    url: null,
    image: { status: 'loading' },
  });

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;
    loadObjectUrl(url)
      .then((src) => {
        if (!cancelled) {
          setState({ url, image: { status: 'loaded', src } });
        }
      })
      .catch((error) => {
        debugLog('Cyberek image load failed:', url, error);
        if (!cancelled) {
          setState({ url, image: { status: 'error' } });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return { status: 'error' };
  }
  // A result for a previous id/kind must not flash while the new one loads.
  return state.url === url ? state.image : { status: 'loading' };
}
