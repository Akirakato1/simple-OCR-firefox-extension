import { MESSAGES, SETTINGS_KEY } from '../shared/constants.js';
import { languageName, targetLanguageOptions } from '../shared/languages.js';
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

function populateTargetLanguageOptions() {
  fields.targetLanguage.innerHTML = '';
  for (const language of targetLanguageOptions()) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.name;
    fields.targetLanguage.append(option);
  }
}

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
  try {
    await browser.runtime.sendMessage({ type: MESSAGES.SETTINGS_CHANGED });
  } catch (_) {
    // The sidebar may not be open while settings are saved.
  }
  status.textContent = `Saved. Target language: ${languageName(settings.targetLanguage)}`;
});

openShortcuts.addEventListener('click', async () => {
  const response = await browser.runtime.sendMessage({ type: MESSAGES.OPEN_SHORTCUTS });
  if (response?.ok) {
    status.textContent = 'Opened Firefox extension shortcut settings.';
    return;
  }
  status.textContent = response?.error || 'Could not open shortcut settings. Open about:addons and choose Manage Extension Shortcuts.';
});

populateTargetLanguageOptions();
loadSettings();
