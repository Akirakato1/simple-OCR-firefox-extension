import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { normalizeSettings, hasRequiredApiKeys } from '../src/shared/settings.js';

test('normalizeSettings fills defaults and clamps image quality', () => {
  const settings = normalizeSettings({ imageQuality: 7, targetLanguage: 'ja', theme: 'discord-dark' });
  assert.equal(settings.targetLanguage, 'JA');
  assert.equal(settings.theme, 'discord-dark');
  assert.equal(settings.imageQuality, DEFAULT_SETTINGS.imageQuality);
  assert.equal(settings.maxHistoryEntries, DEFAULT_SETTINGS.maxHistoryEntries);
});

test('normalizeSettings falls back to system for unknown themes', () => {
  const settings = normalizeSettings({ theme: 'purple-space' });
  assert.equal(settings.theme, 'system');
});

test('normalizeSettings defaults the in-tab panel to the right edge', () => {
  const settings = normalizeSettings({});
  assert.equal(settings.panelSide, 'right');
});

test('normalizeSettings accepts left and right panel sides', () => {
  assert.equal(normalizeSettings({ panelSide: 'left' }).panelSide, 'left');
  assert.equal(normalizeSettings({ panelSide: 'RIGHT' }).panelSide, 'right');
});

test('normalizeSettings falls back to right for unknown panel sides', () => {
  const settings = normalizeSettings({ panelSide: 'bottom' });
  assert.equal(settings.panelSide, 'right');
});

test('hasRequiredApiKeys requires non-empty OCR.space and Google Translate keys', () => {
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', googleTranslateApiKey: 'google' }), true);
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', googleTranslateApiKey: ' ' }), false);
});
