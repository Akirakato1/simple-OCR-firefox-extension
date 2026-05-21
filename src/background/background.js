import { HISTORY_KEY, MESSAGES, SETTINGS_KEY, STATUS } from '../shared/constants.js';
import {
  addHistoryEntry,
  clearNonFavorites,
  createHistoryEntry,
  deleteHistoryEntry,
  sortHistoryNewestFirst,
  toggleFavorite
} from '../shared/history.js';
import { isMeaningfulSelection } from '../shared/image.js';
import { runGoogleTranslate } from '../shared/providers/google-translate.js';
import { runOcrSpace } from '../shared/providers/ocr-space.js';
import { hasRequiredApiKeys, normalizeSettings } from '../shared/settings.js';
import { cropAndCompressSelection } from './capture.js';
import { ensureServiceConnections } from './preflight.js';
import { openExtensionShortcutSettings } from './shortcuts.js';

const CAPTURE_COMMAND = 'start-ocr-capture';
const OVERLAY_FILE = '/src/content/selection-overlay.js';
const selectionWaiters = new Map();

async function getStoredState() {
  const data = await browser.storage.local.get([HISTORY_KEY, SETTINGS_KEY]);
  return {
    history: Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [],
    settings: normalizeSettings(data[SETTINGS_KEY])
  };
}

async function saveHistory(history) {
  await browser.storage.local.set({ [HISTORY_KEY]: sortHistoryNewestFirst(history) });
  try {
    await browser.runtime.sendMessage({ type: MESSAGES.HISTORY_CHANGED });
  } catch (_) {
    // No sidebar listener is active.
  }
}

async function openSidebar() {
  try {
    await browser.sidebarAction.open();
  } catch (_) {
    // Firefox only permits this during user actions; capture can continue.
  }
}

async function toggleSidebar() {
  if (typeof browser.sidebarAction.toggle === 'function') {
    await browser.sidebarAction.toggle();
    return;
  }
  await openSidebar();
}

async function openOptionsPage() {
  await browser.runtime.openOptionsPage();
}

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab is available.');
  }
  return tab;
}

function selectionKey(tabId) {
  return String(tabId);
}

function waitForSelection(tabId) {
  const key = selectionKey(tabId);
  if (selectionWaiters.has(key)) {
    selectionWaiters.get(key).reject(new Error('Selection was replaced by a new request.'));
    selectionWaiters.delete(key);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      selectionWaiters.delete(key);
      reject(new Error('Selection timed out.'));
    }, 60_000);

    selectionWaiters.set(key, {
      resolve(value) {
        clearTimeout(timer);
        resolve(value);
      },
      reject(error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  });
}

async function startSelection(tabId) {
  await browser.tabs.executeScript(tabId, { file: OVERLAY_FILE, runAt: 'document_idle' });
  const selection = waitForSelection(tabId);
  await browser.tabs.sendMessage(tabId, { type: MESSAGES.START_SELECTION });
  return selection;
}

function errorEntry({ status, stage, message, source, image = {} }) {
  return createHistoryEntry({
    status,
    source,
    image,
    error: {
      stage,
      message,
      retryable: true
    }
  });
}

async function translateText({ settings, text }) {
  if (!text.trim()) {
    return {
      targetLanguage: settings.targetLanguage,
      detectedSourceLanguage: null,
      text: ''
    };
  }

  const translation = await runGoogleTranslate({
    apiKey: settings.googleTranslateApiKey,
    text,
    targetLanguage: settings.targetLanguage
  });

  return {
    targetLanguage: settings.targetLanguage,
    ...translation
  };
}

function tabSource(tab) {
  return {
    tabTitle: tab.title || '',
    tabUrl: tab.url || ''
  };
}

async function runCaptureFlow() {
  await openSidebar();
  const tab = await activeTab();
  const source = tabSource(tab);
  const { history, settings } = await getStoredState();

  if (!hasRequiredApiKeys(settings)) {
    await openOptionsPage();
    return;
  }

  const preflight = await ensureServiceConnections({ settings });
  if (!preflight.ok) {
    if (preflight.stage === 'settings') {
      await openOptionsPage();
    }
    await saveHistory(addHistoryEntry(history, errorEntry({
      status: preflight.stage === 'ocr' ? STATUS.OCR_FAILED : STATUS.TRANSLATION_FAILED,
      stage: preflight.stage,
      message: preflight.message,
      source
    }), settings.maxHistoryEntries));
    return;
  }

  let selection;
  try {
    selection = await startSelection(tab.id);
  } catch (error) {
    await saveHistory(addHistoryEntry(history, errorEntry({
      status: STATUS.OCR_FAILED,
      stage: 'selection',
      message: error.message,
      source
    }), settings.maxHistoryEntries));
    return;
  }

  if (selection?.cancelled) {
    return;
  }

  if (!isMeaningfulSelection(selection?.rect)) {
    return;
  }

  let capture;
  try {
    const tabImage = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    capture = await cropAndCompressSelection({
      imageDataUrl: tabImage,
      rect: selection.rect,
      settings
    });
  } catch (error) {
    await saveHistory(addHistoryEntry(history, errorEntry({
      status: STATUS.SIZE_FAILED,
      stage: error.stage || 'compression',
      message: error.message,
      source
    }), settings.maxHistoryEntries));
    return;
  }

  let ocr;
  try {
    ocr = await runOcrSpace({
      apiKey: settings.ocrSpaceApiKey,
      imageDataUrl: capture.imageDataUrl
    });
  } catch (error) {
    await saveHistory(addHistoryEntry(history, errorEntry({
      status: STATUS.OCR_FAILED,
      stage: 'ocr',
      message: error.message,
      source,
      image: {
        ...capture,
        originalDataUrl: settings.saveOriginalCrop ? capture.imageDataUrl : null
      }
    }), settings.maxHistoryEntries));
    return;
  }

  let translation;
  let status = STATUS.COMPLETE;
  let error = { stage: null, message: null, retryable: true };
  try {
    translation = await translateText({ settings, text: ocr.text });
  } catch (translationError) {
    status = STATUS.TRANSLATION_FAILED;
    translation = {
      targetLanguage: settings.targetLanguage,
      detectedSourceLanguage: null,
      text: ''
    };
    error = {
      stage: 'translation',
      message: translationError.message,
      retryable: true
    };
  }

  const entry = createHistoryEntry({
    status,
    detectedLanguage: translation.detectedSourceLanguage || ocr.detectedLanguage,
    source,
    image: {
      thumbnailDataUrl: capture.thumbnailDataUrl,
      originalDataUrl: settings.saveOriginalCrop ? capture.imageDataUrl : null,
      width: capture.width,
      height: capture.height,
      uploadBytes: capture.uploadBytes
    },
    ocr,
    translation,
    error
  });

  await saveHistory(addHistoryEntry(history, entry, settings.maxHistoryEntries));
}

async function retryTranslation(id) {
  const { history, settings } = await getStoredState();
  const index = history.findIndex((entry) => entry.id === id);
  const entry = history[index];
  if (!entry?.ocr?.text || !hasRequiredApiKeys(settings)) {
    await openOptionsPage();
    return;
  }

  try {
    const translation = await translateText({ settings, text: entry.ocr.text });
    const updated = createHistoryEntry({
      ...entry,
      status: STATUS.COMPLETE,
      detectedLanguage: translation.detectedSourceLanguage || entry.ocr.detectedLanguage || entry.detectedLanguage,
      translation,
      error: { stage: null, message: null, retryable: true }
    });
    const next = [...history];
    next[index] = updated;
    await saveHistory(next);
  } catch (error) {
    const next = [...history];
    next[index] = createHistoryEntry({
      ...entry,
      status: STATUS.TRANSLATION_FAILED,
      error: { stage: 'translation', message: error.message, retryable: true }
    });
    await saveHistory(next);
  }
}

async function retryOcr(id) {
  const { history, settings } = await getStoredState();
  const index = history.findIndex((entry) => entry.id === id);
  const entry = history[index];
  if (!entry?.image?.originalDataUrl || !hasRequiredApiKeys(settings)) {
    await openOptionsPage();
    return;
  }

  try {
    const ocr = await runOcrSpace({
      apiKey: settings.ocrSpaceApiKey,
      imageDataUrl: entry.image.originalDataUrl
    });
    const translation = await translateText({ settings, text: ocr.text });
    const updated = createHistoryEntry({
      ...entry,
      status: STATUS.COMPLETE,
      detectedLanguage: translation.detectedSourceLanguage || ocr.detectedLanguage,
      ocr,
      translation,
      error: { stage: null, message: null, retryable: true }
    });
    const next = [...history];
    next[index] = updated;
    await saveHistory(next);
  } catch (error) {
    const next = [...history];
    next[index] = createHistoryEntry({
      ...entry,
      status: STATUS.OCR_FAILED,
      error: { stage: 'ocr', message: error.message, retryable: true }
    });
    await saveHistory(next);
  }
}

async function openShortcutSettings() {
  return openExtensionShortcutSettings(browser);
}

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') {
    return;
  }
  const { settings } = await getStoredState();
  if (!hasRequiredApiKeys(settings)) {
    await openOptionsPage();
  }
});

browser.commands.onCommand.addListener((command) => {
  if (command === CAPTURE_COMMAND) {
    runCaptureFlow().catch((error) => {
      console.error('Capture flow failed', error);
    });
  }
});

browser.browserAction.onClicked.addListener(() => {
  toggleSidebar().catch((error) => {
    console.error('Could not toggle sidebar from toolbar button', error);
  });
});

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === MESSAGES.SELECTION_COMPLETE && sender.tab?.id) {
    const waiter = selectionWaiters.get(selectionKey(sender.tab.id));
    if (waiter) {
      selectionWaiters.delete(selectionKey(sender.tab.id));
      waiter.resolve(message);
    }
    return undefined;
  }

  if (message?.type === MESSAGES.RETRY_TRANSLATION) {
    return retryTranslation(message.id);
  }
  if (message?.type === MESSAGES.RETRY_OCR) {
    return retryOcr(message.id);
  }
  if (message?.type === MESSAGES.DELETE_ENTRY) {
    return getStoredState().then(({ history }) => saveHistory(deleteHistoryEntry(history, message.id)));
  }
  if (message?.type === MESSAGES.TOGGLE_FAVORITE) {
    return getStoredState().then(({ history }) => saveHistory(toggleFavorite(history, message.id)));
  }
  if (message?.type === MESSAGES.CLEAR_NON_FAVORITES) {
    return getStoredState().then(({ history }) => saveHistory(clearNonFavorites(history)));
  }
  if (message?.type === MESSAGES.CLEAR_ALL) {
    return saveHistory([]);
  }
  if (message?.type === MESSAGES.OPEN_OPTIONS) {
    return openOptionsPage();
  }
  if (message?.type === MESSAGES.OPEN_SIDEBAR) {
    return openSidebar();
  }
  if (message?.type === MESSAGES.OPEN_SHORTCUTS) {
    return openShortcutSettings();
  }

  return undefined;
});
