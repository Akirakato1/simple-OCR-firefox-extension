import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHistoryEntry,
  deleteHistoryEntry,
  filterHistory,
  pruneHistory,
  toggleFavorite
} from '../src/shared/history.js';

test('createHistoryEntry creates a complete newest-ready record', () => {
  const entry = createHistoryEntry({
    id: 'entry-1',
    createdAt: '2026-05-21T00:00:00.000Z',
    detectedLanguage: 'ES',
    source: { tabTitle: 'Example', tabUrl: 'https://example.com' },
    image: { thumbnailDataUrl: 'data:image/jpeg;base64,aaa', width: 20, height: 10, uploadBytes: 12 },
    ocr: { text: 'hola', detectedLanguage: 'spa' },
    translation: { targetLanguage: 'EN', detectedSourceLanguage: 'ES', text: 'Hello' }
  });

  assert.equal(entry.favorite, false);
  assert.equal(entry.status, 'complete');
  assert.equal(entry.detectedLanguage, 'ES');
  assert.equal(entry.translation.text, 'Hello');
});

test('pruneHistory removes oldest non-favorites first', () => {
  const history = [
    { id: 'new', favorite: false, createdAt: '2026-05-21T03:00:00.000Z' },
    { id: 'favorite', favorite: true, createdAt: '2026-05-21T02:00:00.000Z' },
    { id: 'old', favorite: false, createdAt: '2026-05-21T01:00:00.000Z' }
  ];
  assert.deepEqual(pruneHistory(history, 2).map((entry) => entry.id), ['new', 'favorite']);
});

test('history actions toggle favorite, delete, and filter text', () => {
  const history = [
    createHistoryEntry({ id: 'a', ocr: { text: 'bonjour' }, translation: { text: 'hello' }, detectedLanguage: 'FR' }),
    createHistoryEntry({ id: 'b', ocr: { text: 'adios' }, translation: { text: 'goodbye' }, detectedLanguage: 'ES' })
  ];

  assert.equal(toggleFavorite(history, 'a')[0].favorite, true);
  assert.deepEqual(deleteHistoryEntry(history, 'a').map((entry) => entry.id), ['b']);
  assert.deepEqual(filterHistory(history, { query: 'good', favoritesOnly: false }).map((entry) => entry.id), ['b']);
  assert.deepEqual(filterHistory(history, { query: 'spanish', favoritesOnly: false }).map((entry) => entry.id), ['b']);
  assert.deepEqual(filterHistory(history, { detectedLanguage: 'spa', favoritesOnly: false }).map((entry) => entry.id), ['b']);
});
