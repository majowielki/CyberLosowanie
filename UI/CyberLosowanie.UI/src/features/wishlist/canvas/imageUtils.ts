import { TranslatableError } from '@/shared/i18n';
import {
  IMAGE_DOWNSCALE_JPEG_QUALITY,
  IMAGE_DOWNSCALE_MAX_EDGE,
  IMAGE_DOWNSCALE_WEBP_QUALITY,
  MAX_IMAGE_UPLOAD_BYTES,
} from './canvasConstants';

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
}

/** Formats the server stores as they are. */
const UPLOADABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Formats offered in the picker on top of those: phone cameras often save HEIC
 * and screenshots or downloads come as AVIF/GIF/BMP. A picker limited to the
 * three uploadable types simply hides such photos, so they are offered and
 * re-encoded here whenever the browser can decode them (Safari reads HEIC,
 * Chrome does not — that case ends in the badType message).
 */
const CONVERTIBLE_IMAGE_TYPES = ['image/heic', 'image/heif', 'image/avif', 'image/gif', 'image/bmp'];

/** Input accept attribute for the hidden file picker. */
export const IMAGE_FILE_ACCEPT = [
  ...UPLOADABLE_IMAGE_TYPES,
  ...CONVERTIBLE_IMAGE_TYPES,
  // Some systems report HEIC with an empty MIME type; the extension still matches.
  '.heic',
  '.heif',
].join(',');

const HEIC_EXTENSION = /\.hei[cf]$/i;

/**
 * Prepares a picked file for upload: rejects non-image types up front, then
 * downscales anything larger than IMAGE_DOWNSCALE_MAX_EDGE (re-encoded as JPEG,
 * or as WebP when the source may be transparent) —
 * the server-side 5 MB limit is a safety net, not a target (doc 4.3).
 * Returns the file to upload together with its pixel dimensions, which the
 * editor needs to place the image on the canvas.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const uploadable = UPLOADABLE_IMAGE_TYPES.includes(file.type);
  const convertible = CONVERTIBLE_IMAGE_TYPES.includes(file.type) || HEIC_EXTENSION.test(file.name);
  if (!uploadable && !convertible) {
    throw new TranslatableError('wishlist.image.badType');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    // A format the browser cannot decode (HEIC outside Safari) is a format
    // problem for the user, not a broken file.
    throw new TranslatableError(uploadable ? 'wishlist.image.readFailed' : 'wishlist.image.badType');
  });

  try {
    const longerEdge = Math.max(bitmap.width, bitmap.height);
    const needsDownscale = longerEdge > IMAGE_DOWNSCALE_MAX_EDGE;

    if (uploadable && !needsDownscale && file.size <= MAX_IMAGE_UPLOAD_BYTES) {
      return { file, width: bitmap.width, height: bitmap.height };
    }

    const scale = needsDownscale ? IMAGE_DOWNSCALE_MAX_EDGE / longerEdge : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new TranslatableError('wishlist.image.processFailed');
    }
    // PNG/WebP may carry transparency (cut-out lettering, stickers): keep it
    // with a WebP re-encode. JPEG has no alpha channel, so a JPEG source is
    // flattened onto white (not black) and stays JPEG.
    const keepsAlpha = file.type !== 'image/jpeg';
    if (!keepsAlpha) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      keepsAlpha
        ? canvas.toBlob(resolve, 'image/webp', IMAGE_DOWNSCALE_WEBP_QUALITY)
        : canvas.toBlob(resolve, 'image/jpeg', IMAGE_DOWNSCALE_JPEG_QUALITY),
    );
    if (!blob) {
      throw new TranslatableError('wishlist.image.processFailed');
    }
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new TranslatableError('wishlist.image.tooLarge');
    }

    // A browser without WebP encoding falls back to PNG (still transparent):
    // name and type the file after what was actually produced.
    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'zdjecie';
    return {
      file: new File([blob], `${baseName}.${extension}`, { type: blob.type || 'image/jpeg' }),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
