import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { normalizeSettings, hasRequiredApiKeys } from '../src/shared/settings.js';

test('normalizeSettings fills defaults and clamps image quality', () => {
  const settings = normalizeSettings({ imageQuality: 7, targetLanguage: 'ja' });
  assert.equal(settings.targetLanguage, 'JA');
  assert.equal(settings.imageQuality, DEFAULT_SETTINGS.imageQuality);
  assert.equal(settings.maxHistoryEntries, DEFAULT_SETTINGS.maxHistoryEntries);
});

test('hasRequiredApiKeys requires non-empty OCR.space and DeepL keys', () => {
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', deeplApiKey: 'deepl' }), true);
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', deeplApiKey: ' ' }), false);
});
