import { runGoogleTranslate } from '../shared/providers/google-translate.js';
import { runOcrSpace } from '../shared/providers/ocr-space.js';
import { hasRequiredApiKeys, normalizeSettings } from '../shared/settings.js';

// Tiny PNG containing "OK" keeps OCR.space preflight close to a real OCR call.
const OCR_PREFLIGHT_IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAA8CAYAAADha7EVAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAALYSURBVHhe7ZlbjoMwDEVZXhbEcthLt9KdZERLOwz4Og5BYzm5R/JPJy/JBzswUybEken4AyH/CQUkrlBA4goFJK5QQOIKBSSuUEDiCgUkrlBA4goFJK5QQOIKBSSuUEDiCgUkrlBA4kq3Aj7mKU+TEvPjOMXII8/HtaYpp+V5HKggr9F+tnh0JeBzSedkGqIu37I8dgHl+d+oO0x4OhGwkFRTzNmWenkvm4DPvKTz3G+kJVtW6Yn4Aj6XnI6JvBwplz26KiDlkwguoCxDW5QklPcsCajeSQeVbyWwgIWKsga4T5Xvilo7rheQ8mHCCqhKZEyqJgYWqk5A9Zyq6GMQVEBZglcY5fuAJURyyHtLAlK+MjEFfMxCQq8mFbdySSqzgPCMV8/ZJyEFRFXrJIERWKnEamoQUH0zL73kjEVAAVHFakgsFEaqVAUB4VqNZ+yUgALKAsiyWKmRWt7/LaD8t79jyJ54AqIKI7ZLO6itn7/kyJKlZRF//xstD0mfUMCNVgHNcV5waCjgxr8JKK45LhRw434BU07ivXINtuIPFHDjbgHf85Sx54WHJJ6AMKktVaX9LXgfe7fgN0ZR7vEIKCCSpSGhqKqKUusCns+AzyuvPxYBBcTt8mpbg1VKbOtYQLi99m85OGkMQgqIEyq1zBJYKPnDsTxeHvsLfGgunbkfYgoIJHiFWLUwWAzUHuW9SwLiNl9/5p4IKqDSNlV59mh3M601XhSwcGbL/B4JK2BRoDVAZdFEeIcm8HUB0dx3jNmKAwtYaGuXoySCLJFNQO3+ih+Ynokt4MrNEsLO+6VRwELltq/TB/EFfCFLURda290j71UljvrQlCpwX3Qi4IbW3pSokucOAdW377FacV8C7lAT3JTkewRE63yifBXog24FJDGggMQVCkhcoYDEFQpIXKGAxBUKSFyhgMQVCkhcoYDEFQpIXKGAxBUKSFyhgMQVCkhc+QEbTkX7qC6XDAAAAABJRU5ErkJggg==';
const TRANSLATION_PREFLIGHT_TEXT = 'connection test';

function failure(stage, error) {
  return {
    ok: false,
    stage,
    message: error?.message || String(error || 'Service connection failed')
  };
}

export async function ensureServiceConnections({
  settings,
  runOcr = runOcrSpace,
  runTranslate = runGoogleTranslate
}) {
  const normalized = normalizeSettings(settings);

  if (!hasRequiredApiKeys(normalized)) {
    return {
      ok: false,
      stage: 'settings',
      message: 'OCR.space and Google Translation API keys are required before capture can run.'
    };
  }

  try {
    await runOcr({
      apiKey: normalized.ocrSpaceApiKey,
      imageDataUrl: OCR_PREFLIGHT_IMAGE_DATA_URL
    });
  } catch (error) {
    return failure('ocr', error);
  }

  try {
    await runTranslate({
      apiKey: normalized.googleTranslateApiKey,
      text: TRANSLATION_PREFLIGHT_TEXT,
      targetLanguage: normalized.targetLanguage
    });
  } catch (error) {
    return failure('translation', error);
  }

  return { ok: true };
}
