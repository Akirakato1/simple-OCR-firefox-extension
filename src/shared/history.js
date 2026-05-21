import { STATUS } from './constants.js';

function fallbackId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value) {
  return String(value || '').trim();
}

export function createHistoryEntry(value = {}) {
  const ocr = value.ocr || {};
  const translation = value.translation || {};
  const image = value.image || {};
  const source = value.source || {};
  const error = value.error || {};
  const detectedLanguage = value.detectedLanguage
    || translation.detectedSourceLanguage
    || ocr.detectedLanguage
    || null;

  return {
    id: value.id || fallbackId(),
    createdAt: value.createdAt || new Date().toISOString(),
    favorite: Boolean(value.favorite),
    status: value.status || STATUS.COMPLETE,
    detectedLanguage,
    source: {
      tabTitle: normalizeText(source.tabTitle),
      tabUrl: normalizeText(source.tabUrl)
    },
    image: {
      thumbnailDataUrl: image.thumbnailDataUrl || '',
      originalDataUrl: image.originalDataUrl || null,
      width: Number(image.width || 0),
      height: Number(image.height || 0),
      uploadBytes: Number(image.uploadBytes || 0)
    },
    ocr: {
      text: normalizeText(ocr.text),
      detectedLanguage: ocr.detectedLanguage || null,
      rawProviderLanguage: ocr.rawProviderLanguage || null
    },
    translation: {
      targetLanguage: normalizeText(translation.targetLanguage || 'EN').toUpperCase(),
      detectedSourceLanguage: translation.detectedSourceLanguage || null,
      text: normalizeText(translation.text)
    },
    error: {
      stage: error.stage || null,
      message: error.message || null,
      retryable: error.retryable ?? true
    }
  };
}

export function sortHistoryNewestFirst(history = []) {
  return [...history].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function pruneHistory(history = [], maxEntries = 100) {
  if (history.length <= maxEntries) {
    return [...history];
  }

  const removable = [...history]
    .filter((entry) => !entry.favorite)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const removeCount = history.length - maxEntries;
  const removeIds = new Set(removable.slice(0, removeCount).map((entry) => entry.id));

  if (removeIds.size === 0) {
    return [...history];
  }

  return history.filter((entry) => !removeIds.has(entry.id));
}

export function addHistoryEntry(history = [], entry, maxEntries = 100) {
  return pruneHistory(sortHistoryNewestFirst([createHistoryEntry(entry), ...history]), maxEntries);
}

export function toggleFavorite(history = [], id) {
  return history.map((entry) => (
    entry.id === id ? { ...entry, favorite: !entry.favorite } : entry
  ));
}

export function deleteHistoryEntry(history = [], id) {
  return history.filter((entry) => entry.id !== id);
}

export function clearNonFavorites(history = []) {
  return history.filter((entry) => entry.favorite);
}

export function filterHistory(history = [], filters = {}) {
  const query = normalizeText(filters.query).toLowerCase();
  const detectedLanguage = normalizeText(filters.detectedLanguage).toLowerCase();
  const targetLanguage = normalizeText(filters.targetLanguage).toLowerCase();

  return history.filter((entry) => {
    if (filters.favoritesOnly && !entry.favorite) {
      return false;
    }

    if (detectedLanguage && String(entry.detectedLanguage || '').toLowerCase() !== detectedLanguage) {
      return false;
    }

    if (targetLanguage && String(entry.translation?.targetLanguage || '').toLowerCase() !== targetLanguage) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      entry.detectedLanguage,
      entry.source?.tabTitle,
      entry.source?.tabUrl,
      entry.ocr?.text,
      entry.translation?.text,
      entry.translation?.targetLanguage
    ].join(' ').toLowerCase();

    return searchable.includes(query);
  });
}
