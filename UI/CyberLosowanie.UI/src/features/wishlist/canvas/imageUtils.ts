import { TranslatableError } from '@/shared/i18n';
import {
  IMAGE_DOWNSCALE_JPEG_QUALITY,
  IMAGE_DOWNSCALE_MAX_EDGE,
  MAX_IMAGE_UPLOAD_BYTES,
} from './canvasConstants';

export interface PreparedImage {
  file: File;
  width: number;
  height: number;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Input accept attribute for the hidden file picker. */
export const IMAGE_FILE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Prepares a picked file for upload: rejects non-image types up front, then
 * downscales anything larger than IMAGE_DOWNSCALE_MAX_EDGE (JPEG re-encode) —
 * the server-side 5 MB limit is a safety net, not a target (doc 4.3).
 * Returns the file to upload together with its pixel dimensions, which the
 * editor needs to place the image on the canvas.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new TranslatableError('wishlist.image.badType');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new TranslatableError('wishlist.image.readFailed');
  });

  try {
    const longerEdge = Math.max(bitmap.width, bitmap.height);
    const needsDownscale = longerEdge > IMAGE_DOWNSCALE_MAX_EDGE;

    if (!needsDownscale && file.size <= MAX_IMAGE_UPLOAD_BYTES) {
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
    // JPEG has no alpha channel — flatten transparency onto white, not black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_DOWNSCALE_JPEG_QUALITY),
    );
    if (!blob) {
      throw new TranslatableError('wishlist.image.processFailed');
    }
    if (blob.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new TranslatableError('wishlist.image.tooLarge');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'zdjecie';
    return {
      file: new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }),
      width,
      height,
    };
  } finally {
    bitmap.close();
  }
}
