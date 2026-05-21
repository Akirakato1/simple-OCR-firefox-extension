const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';

export function buildDeepLParams({ text, targetLanguage }) {
  const params = new URLSearchParams();
  params.set('text', String(text || '').trim());
  params.set('target_lang', String(targetLanguage || 'EN').trim().toUpperCase());
  return params;
}

export function parseDeepLResponse(payload) {
  const first = Array.isArray(payload?.translations) ? payload.translations[0] : null;
  if (!first?.text) {
    throw new Error(payload?.message || 'DeepL request failed');
  }
  return {
    text: String(first.text).trim(),
    detectedSourceLanguage: first.detected_source_language || null
  };
}

export async function runDeepL({ fetchImpl = fetch, apiKey, text, targetLanguage }) {
  const body = buildDeepLParams({ text, targetLanguage });
  const response = await fetchImpl(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${String(apiKey || '').trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || 'DeepL request failed');
  }
  return parseDeepLResponse(payload);
}
