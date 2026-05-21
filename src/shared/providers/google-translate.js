const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

export function buildGoogleTranslateUrl({ apiKey, text, targetLanguage }) {
  const url = new URL(GOOGLE_TRANSLATE_ENDPOINT);
  url.searchParams.set('key', String(apiKey || '').trim());
  url.searchParams.set('q', String(text || '').trim());
  url.searchParams.set('target', String(targetLanguage || 'EN').trim().toLowerCase());
  url.searchParams.set('format', 'text');
  return url;
}

export function parseGoogleTranslateResponse(payload) {
  const first = Array.isArray(payload?.data?.translations) ? payload.data.translations[0] : null;
  if (!first?.translatedText) {
    throw new Error(payload?.error?.message || 'Google Translate request failed');
  }
  return {
    text: String(first.translatedText).trim(),
    detectedSourceLanguage: first.detectedSourceLanguage
      ? String(first.detectedSourceLanguage).toUpperCase()
      : null
  };
}

export async function runGoogleTranslate({ fetchImpl = fetch, apiKey, text, targetLanguage }) {
  const url = buildGoogleTranslateUrl({ apiKey, text, targetLanguage });
  const response = await fetchImpl(url, { method: 'POST' });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Google Translate request failed');
  }
  return parseGoogleTranslateResponse(payload);
}
