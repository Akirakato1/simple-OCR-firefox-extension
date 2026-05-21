import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOcrSpaceFormData, parseOcrSpaceResponse } from '../src/shared/providers/ocr-space.js';
import { buildDeepLParams, parseDeepLResponse } from '../src/shared/providers/deepl.js';

test('parseOcrSpaceResponse extracts parsed text and language', () => {
  const result = parseOcrSpaceResponse({
    IsErroredOnProcessing: false,
    ParsedResults: [{ ParsedText: 'hola\n', TextOverlay: { Lines: [] }, FileParseExitCode: 1 }],
    OCRExitCode: 1,
    ProcessingTimeInMilliseconds: '12'
  });

  assert.equal(result.text, 'hola');
  assert.equal(result.detectedLanguage, null);
});

test('parseOcrSpaceResponse throws provider error message', () => {
  assert.throws(() => parseOcrSpaceResponse({
    IsErroredOnProcessing: true,
    ErrorMessage: ['Invalid API key']
  }), /Invalid API key/);
});

test('buildOcrSpaceFormData uses broad auto-detect OCR settings', () => {
  const body = buildOcrSpaceFormData({
    apiKey: 'ocr-key',
    imageDataUrl: 'data:image/jpeg;base64,abc',
    fileName: 'capture.jpg'
  });

  assert.equal(body.get('apikey'), 'ocr-key');
  assert.equal(body.get('isOverlayRequired'), 'false');
  assert.equal(body.get('language'), 'auto');
  assert.equal(body.get('OCREngine'), '3');
  assert.ok(body.get('base64Image').startsWith('data:image/jpeg;base64,abc'));
});

test('parseDeepLResponse extracts translation and source language', () => {
  const result = parseDeepLResponse({
    translations: [{ detected_source_language: 'JA', text: 'Hello' }]
  });

  assert.equal(result.text, 'Hello');
  assert.equal(result.detectedSourceLanguage, 'JA');
});

test('buildDeepLParams normalizes target language and text', () => {
  const params = buildDeepLParams({ text: ' Bonjour ', targetLanguage: 'en' });
  assert.equal(params.get('text'), 'Bonjour');
  assert.equal(params.get('target_lang'), 'EN');
});
