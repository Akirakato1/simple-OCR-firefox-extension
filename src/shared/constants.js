export const DEFAULT_SETTINGS = Object.freeze({
  ocrSpaceApiKey: '',
  googleTranslateApiKey: '',
  targetLanguage: 'EN',
  imageFormat: 'image/jpeg',
  imageQuality: 0.82,
  maxUploadBytes: 1_000_000,
  saveOriginalCrop: false,
  maxHistoryEntries: 100,
  theme: 'system',
  panelSide: 'right'
});

export const HISTORY_KEY = 'history';
export const SETTINGS_KEY = 'settings';

export const STATUS = Object.freeze({
  COMPLETE: 'complete',
  OCR_FAILED: 'ocr_failed',
  TRANSLATION_FAILED: 'translation_failed',
  SIZE_FAILED: 'size_failed'
});

export const MESSAGES = Object.freeze({
  START_SELECTION: 'start-selection',
  SELECTION_COMPLETE: 'selection-complete',
  HISTORY_CHANGED: 'history-changed',
  SETTINGS_CHANGED: 'settings-changed',
  RETRY_OCR: 'retry-ocr',
  RETRY_TRANSLATION: 'retry-translation',
  DELETE_ENTRY: 'delete-entry',
  TOGGLE_FAVORITE: 'toggle-favorite',
  CLEAR_NON_FAVORITES: 'clear-non-favorites',
  CLEAR_ALL: 'clear-all',
  OPEN_OPTIONS: 'open-options',
  OPEN_PANEL: 'open-panel',
  TOGGLE_PANEL: 'toggle-panel',
  SET_PANEL_VISIBILITY: 'set-panel-visibility',
  OPEN_SHORTCUTS: 'open-shortcuts'
});
