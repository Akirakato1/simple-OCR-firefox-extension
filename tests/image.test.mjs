import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateDataUrlBytes,
  normalizeSelectionRect,
  planNextCompressionAttempt,
  toThumbnailSize
} from '../src/shared/image.js';

test('estimateDataUrlBytes estimates base64 payload bytes', () => {
  assert.equal(estimateDataUrlBytes('data:image/jpeg;base64,AAAA'), 3);
});

test('normalizeSelectionRect supports dragging in any direction', () => {
  assert.deepEqual(normalizeSelectionRect({ startX: 100, startY: 50, endX: 20, endY: 10 }), {
    x: 20,
    y: 10,
    width: 80,
    height: 40
  });
});

test('planNextCompressionAttempt lowers quality before downscaling', () => {
  assert.deepEqual(planNextCompressionAttempt({ quality: 0.82, scale: 1 }), { quality: 0.72, scale: 1 });
  assert.deepEqual(planNextCompressionAttempt({ quality: 0.42, scale: 1 }), { quality: 0.42, scale: 0.85 });
});

test('toThumbnailSize preserves aspect ratio inside bounds', () => {
  assert.deepEqual(toThumbnailSize({ width: 1600, height: 800, maxWidth: 320, maxHeight: 180 }), {
    width: 320,
    height: 160
  });
});
