import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOcrSpaceFormData, parseOcrSpaceResponse } from '../src/shared/providers/ocr-space.js';
import { buildGoogleTranslateUrl, parseGoogleTranslateResponse } from '../src/shared/providers/google-translate.js';

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

test('parseGoogleTranslateResponse extracts translation and source language', () => {
  const result = parseGoogleTranslateResponse({
    data: {
      translations: [{ detectedSourceLanguage: 'ja', translatedText: 'Hello' }]
    }
  });

  assert.equal(result.text, 'Hello');
  assert.equal(result.detectedSourceLanguage, 'JA');
});

test('buildGoogleTranslateUrl includes API key and normalized query parameters', () => {
  const url = buildGoogleTranslateUrl({ apiKey: 'google-key', text: ' Bonjour ', targetLanguage: 'en' });

  assert.equal(url.origin, 'https://translation.googleapis.com');
  assert.equal(url.searchParams.get('key'), 'google-key');
  assert.equal(url.searchParams.get('q'), 'Bonjour');
  assert.equal(url.searchParams.get('target'), 'en');
  assert.equal(url.searchParams.get('format'), 'text');
});
