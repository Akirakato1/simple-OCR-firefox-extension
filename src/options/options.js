import { MESSAGES, SETTINGS_KEY } from '../shared/constants.js';
import { normalizeSettings } from '../shared/settings.js';

const form = document.querySelector('#settings-form');
const status = document.querySelector('#status');
const openShortcuts = document.querySelector('#open-shortcuts');

const fields = {
  ocrSpaceApiKey: document.querySelector('#ocr-key'),
  googleTranslateApiKey: document.querySelector('#google-key'),
  targetLanguage: document.querySelector('#target-language'),
  imageQuality: document.querySelector('#image-quality'),
  maxUploadBytes: document.querySelector('#max-upload-bytes'),
  saveOriginalCrop: document.querySelector('#save-original'),
  maxHistoryEntries: document.querySelector('#max-history')
};

async function loadSettings() {
  const data = await browser.storage.local.get(SETTINGS_KEY);
  const settings = normalizeSettings(data[SETTINGS_KEY]);
  fields.ocrSpaceApiKey.value = settings.ocrSpaceApiKey;
  fields.googleTranslateApiKey.value = settings.googleTranslateApiKey;
  fields.targetLanguage.value = settings.targetLanguage;
  fields.imageQuality.value = settings.imageQuality;
  fields.maxUploadBytes.value = settings.maxUploadBytes;
  fields.saveOriginalCrop.checked = settings.saveOriginalCrop;
  fields.maxHistoryEntries.value = settings.maxHistoryEntries;
}

function readForm() {
  return normalizeSettings({
    ocrSpaceApiKey: fields.ocrSpaceApiKey.value,
    googleTranslateApiKey: fields.googleTranslateApiKey.value,
    targetLanguage: fields.targetLanguage.value,
    imageQuality: Number(fields.imageQuality.value),
    maxUploadBytes: Number(fields.maxUploadBytes.value),
    saveOriginalCrop: fields.saveOriginalCrop.checked,
    maxHistoryEntries: Number(fields.maxHistoryEntries.value)
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const settings = readForm();
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  status.textContent = `Saved. Target language: ${settings.targetLanguage}`;
});

openShortcuts.addEventListener('click', async () => {
  const response = await browser.runtime.sendMessage({ type: MESSAGES.OPEN_SHORTCUTS });
  if (response?.ok) {
    status.textContent = 'Opened Firefox extension shortcut settings.';
    return;
  }
  status.textContent = response?.error || 'Could not open shortcut settings. Open about:addons and choose Manage Extension Shortcuts.';
});

loadSettings();
