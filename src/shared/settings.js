import { DEFAULT_SETTINGS } from './constants.js';
import { normalizeThemePreference } from './theme.js';

export function normalizePanelSide(value) {
  const side = String(value || '').trim().toLowerCase();
  return side === 'left' || side === 'right' ? side : DEFAULT_SETTINGS.panelSide;
}

export function normalizeSettings(value = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...value };
  const quality = Number(merged.imageQuality);
  const maxUploadBytes = Number(merged.maxUploadBytes);
  const maxHistoryEntries = Number(merged.maxHistoryEntries);

  return {
    ...merged,
    ocrSpaceApiKey: String(merged.ocrSpaceApiKey || '').trim(),
    googleTranslateApiKey: String(merged.googleTranslateApiKey || '').trim(),
    targetLanguage: String(merged.targetLanguage || DEFAULT_SETTINGS.targetLanguage).trim().toUpperCase(),
    imageFormat: merged.imageFormat === 'image/webp' ? 'image/webp' : DEFAULT_SETTINGS.imageFormat,
    imageQuality: quality > 0 && quality <= 1 ? quality : DEFAULT_SETTINGS.imageQuality,
    maxUploadBytes: Number.isInteger(maxUploadBytes) && maxUploadBytes > 0 ? maxUploadBytes : DEFAULT_SETTINGS.maxUploadBytes,
    saveOriginalCrop: Boolean(merged.saveOriginalCrop),
    maxHistoryEntries: Number.isInteger(maxHistoryEntries) && maxHistoryEntries > 0 ? maxHistoryEntries : DEFAULT_SETTINGS.maxHistoryEntries,
    theme: normalizeThemePreference(merged.theme),
    panelSide: normalizePanelSide(merged.panelSide)
  };
}

export function hasRequiredApiKeys(settings) {
  const normalized = normalizeSettings(settings);
  return normalized.ocrSpaceApiKey.length > 0 && normalized.googleTranslateApiKey.length > 0;
}
