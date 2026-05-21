const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';

function providerMessage(payload) {
  const message = payload?.ErrorMessage || payload?.ErrorDetails || 'OCR.space request failed';
  return Array.isArray(message) ? message.join('; ') : String(message);
}

export function buildOcrSpaceFormData({ apiKey, imageDataUrl, fileName = 'capture.jpg' }) {
  const body = new FormData();
  body.set('apikey', String(apiKey || '').trim());
  body.set('base64Image', imageDataUrl);
  body.set('filetype', fileName.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG');
  body.set('language', 'auto');
  body.set('isOverlayRequired', 'false');
  body.set('scale', 'true');
  body.set('detectOrientation', 'true');
  body.set('OCREngine', '3');
  return body;
}

export function parseOcrSpaceResponse(payload) {
  if (!payload || payload.IsErroredOnProcessing) {
    throw new Error(providerMessage(payload));
  }

  const first = Array.isArray(payload.ParsedResults) ? payload.ParsedResults[0] : null;
  const text = String(first?.ParsedText || '').trim();
  const rawProviderLanguage = first?.Language || payload.DetectedLanguage || null;

  return {
    text,
    detectedLanguage: rawProviderLanguage ? String(rawProviderLanguage).toUpperCase() : null,
    rawProviderLanguage
  };
}

export async function runOcrSpace({ fetchImpl = fetch, apiKey, imageDataUrl }) {
  const response = await fetchImpl(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    body: buildOcrSpaceFormData({ apiKey, imageDataUrl })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(providerMessage(payload));
  }
  return parseOcrSpaceResponse(payload);
}
