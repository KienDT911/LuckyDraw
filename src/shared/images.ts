/** Longest side kept for uploaded images: sharp on a 1920×1080 stage, far lighter than camera originals. */
const MAX_SIDE = 2560;
/** Cloudflare D1 stores each image in one row (2 MB limit); stay well under it. */
export const MAX_IMAGE_BYTES = 1_500_000;

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

/**
 * Makes an uploaded image fit for the stage and for cloud storage: oversized photos are scaled down and
 * re-encoded (WebP keeps transparency); small images are kept as they are. GIF (animation) and SVG (vector)
 * are never re-encoded. Throws when the image cannot be read or cannot be made small enough.
 */
export async function prepareImage(file: Blob): Promise<Blob> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    if (file.size > MAX_IMAGE_BYTES) throw new Error('too_large');
    return file;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size <= MAX_IMAGE_BYTES && file.type.startsWith('image/')) return file;
    throw new Error('unreadable');
  }

  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= MAX_IMAGE_BYTES) return file;

    let quality = 0.9;
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await encode(canvas, quality);
      if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
      // Lower the quality a little first, then shrink.
      if (quality > 0.7) quality -= 0.1;
      else scale *= 0.8;
    }
    throw new Error('too_large');
  } finally {
    bitmap.close();
  }
}
