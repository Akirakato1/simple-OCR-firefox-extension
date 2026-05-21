import { DEFAULT_SETTINGS } from '../shared/constants.js';
import {
  estimateDataUrlBytes,
  planNextCompressionAttempt,
  toThumbnailSize
} from '../shared/image.js';
import { normalizeSettings } from '../shared/settings.js';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load captured image'));
    image.src = dataUrl;
  });
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function viewportScaledRect(image, rect) {
  const viewportWidth = Number(rect.viewportWidth || image.naturalWidth || image.width);
  const viewportHeight = Number(rect.viewportHeight || image.naturalHeight || image.height);
  const scaleX = (image.naturalWidth || image.width) / viewportWidth;
  const scaleY = (image.naturalHeight || image.height) / viewportHeight;

  return {
    x: Math.max(0, Math.round(rect.x * scaleX)),
    y: Math.max(0, Math.round(rect.y * scaleY)),
    width: Math.max(1, Math.round(rect.width * scaleX)),
    height: Math.max(1, Math.round(rect.height * scaleY))
  };
}

function drawScaledCrop(image, sourceRect, scale) {
  const width = Math.max(1, Math.round(sourceRect.width * scale));
  const height = Math.max(1, Math.round(sourceRect.height * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    0,
    0,
    width,
    height
  );
  return canvas;
}

export async function createThumbnail({ imageDataUrl, maxWidth = 320, maxHeight = 180 }) {
  const image = await loadImage(imageDataUrl);
  const size = toThumbnailSize({
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    maxWidth,
    maxHeight
  });
  const canvas = createCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas.toDataURL('image/jpeg', 0.78);
}

export async function cropAndCompressSelection({ imageDataUrl, rect, settings = DEFAULT_SETTINGS }) {
  const normalized = normalizeSettings(settings);
  const image = await loadImage(imageDataUrl);
  const sourceRect = viewportScaledRect(image, rect);
  let quality = normalized.imageQuality;
  let scale = 1;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const canvas = drawScaledCrop(image, sourceRect, scale);
    const croppedDataUrl = canvas.toDataURL(normalized.imageFormat, quality);
    const uploadBytes = estimateDataUrlBytes(croppedDataUrl);

    if (uploadBytes <= normalized.maxUploadBytes) {
      return {
        imageDataUrl: croppedDataUrl,
        thumbnailDataUrl: await createThumbnail({ imageDataUrl: croppedDataUrl }),
        width: canvas.width,
        height: canvas.height,
        uploadBytes
      };
    }

    const next = planNextCompressionAttempt({ quality, scale });
    if (next.quality === quality && next.scale === scale) {
      break;
    }
    quality = next.quality;
    scale = next.scale;
  }

  const error = new Error('Selected region is too large for OCR.space free-tier upload size.');
  error.stage = 'compression';
  error.retryable = false;
  throw error;
}
