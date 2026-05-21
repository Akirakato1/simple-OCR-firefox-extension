export function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',').pop().replace(/\s/g, '');
  if (!base64) {
    return 0;
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function normalizeSelectionRect({ startX, startY, endX, endY }) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function isMeaningfulSelection(rect, minimumSize = 8) {
  return Number(rect?.width || 0) >= minimumSize && Number(rect?.height || 0) >= minimumSize;
}

export function planNextCompressionAttempt({ quality, scale }) {
  const currentQuality = Number(quality);
  const currentScale = Number(scale);

  if (currentQuality > 0.45) {
    return {
      quality: Math.max(0.42, Number((currentQuality - 0.1).toFixed(2))),
      scale: currentScale
    };
  }

  return {
    quality: currentQuality,
    scale: Math.max(0.25, Number((currentScale * 0.85).toFixed(2)))
  };
}

export function toThumbnailSize({ width, height, maxWidth = 320, maxHeight = 180 }) {
  const sourceWidth = Math.max(1, Number(width || 1));
  const sourceHeight = Math.max(1, Number(height || 1));
  const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);

  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio))
  };
}
