import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureServiceConnections } from '../src/background/preflight.js';

const settings = {
  ocrSpaceApiKey: 'ocr-key',
  googleTranslateApiKey: 'google-key',
  targetLanguage: 'EN'
};

test('ensureServiceConnections checks OCR before Google translation', async () => {
  const calls = [];
  const result = await ensureServiceConnections({
    settings,
    runOcr: async ({ apiKey, imageDataUrl }) => {
      calls.push(['ocr', apiKey, imageDataUrl.startsWith('data:image/png;base64,')]);
      return { text: '', detectedLanguage: null };
    },
    runTranslate: async ({ apiKey, text, targetLanguage }) => {
      calls.push(['translate', apiKey, text, targetLanguage]);
      return { text: 'Connection test', detectedSourceLanguage: 'EN' };
    }
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [
    ['ocr', 'ocr-key', true],
    ['translate', 'google-key', 'connection test', 'EN']
  ]);
});

test('ensureServiceConnections stops before translation when OCR preflight fails', async () => {
  let translateCalled = false;
  const result = await ensureServiceConnections({
    settings,
    runOcr: async () => {
      throw new Error('Invalid OCR key');
    },
    runTranslate: async () => {
      translateCalled = true;
    }
  });

  assert.equal(translateCalled, false);
  assert.deepEqual(result, {
    ok: false,
    stage: 'ocr',
    message: 'Invalid OCR key'
  });
});

test('ensureServiceConnections reports translation preflight failures', async () => {
  const result = await ensureServiceConnections({
    settings,
    runOcr: async () => ({ text: '', detectedLanguage: null }),
    runTranslate: async () => {
      throw new Error('API key not valid');
    }
  });

  assert.deepEqual(result, {
    ok: false,
    stage: 'translation',
    message: 'API key not valid'
  });
});

test('ensureServiceConnections reports missing keys before network checks', async () => {
  let ocrCalled = false;
  const result = await ensureServiceConnections({
    settings: { ocrSpaceApiKey: '', googleTranslateApiKey: 'google-key' },
    runOcr: async () => {
      ocrCalled = true;
    },
    runTranslate: async () => {}
  });

  assert.equal(ocrCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'settings');
});
