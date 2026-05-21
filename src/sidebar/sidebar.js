import { HISTORY_KEY, MESSAGES, SETTINGS_KEY, STATUS } from '../shared/constants.js';
import { filterHistory } from '../shared/history.js';
import {
  filterPrimaryLanguageCountries,
  languageName,
  languagePairLabel,
  normalizeLanguageCode
} from '../shared/languages.js';
import { hasRequiredApiKeys, normalizeSettings } from '../shared/settings.js';
import { nextSelectedHistoryId } from './selection.js';

const state = {
  history: [],
  settings: normalizeSettings(),
  selectedId: null,
  countryQuery: '',
  filters: {
    query: '',
    detectedLanguage: '',
    favoritesOnly: false
  }
};

const elements = {
  keyStatus: document.querySelector('#key-status'),
  openOptions: document.querySelector('#open-options'),
  latestResult: document.querySelector('#latest-result'),
  copyLatest: document.querySelector('#copy-latest'),
  search: document.querySelector('#search'),
  languageFilter: document.querySelector('#language-filter'),
  favoritesOnly: document.querySelector('#favorites-only'),
  historyList: document.querySelector('#history-list'),
  detailView: document.querySelector('#detail-view'),
  detailActions: document.querySelector('#detail-actions'),
  clearNonFavorites: document.querySelector('#clear-non-favorites'),
  clearAll: document.querySelector('#clear-all')
};

function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

async function loadState() {
  const data = await browser.storage.local.get([HISTORY_KEY, SETTINGS_KEY]);
  state.history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
  state.settings = normalizeSettings(data[SETTINGS_KEY]);
  state.selectedId ||= state.history[0]?.id || null;
  render();
}

function statusClass(entry) {
  if (entry.status === STATUS.COMPLETE) {
    return 'status-complete';
  }
  if (entry.status === STATUS.TRANSLATION_FAILED) {
    return 'status-warn';
  }
  return 'status-error';
}

function shortDate(value) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function textPreview(entry) {
  return entry.translation?.text || entry.ocr?.text || entry.error?.message || 'No text detected';
}

function renderKeyStatus() {
  const ready = hasRequiredApiKeys(state.settings);
  elements.keyStatus.textContent = ready
    ? `Ready. Target: ${languageName(state.settings.targetLanguage)}`
    : 'API keys required.';
  elements.keyStatus.className = ready ? 'muted status-complete' : 'muted status-error';
}

function entryTargetLanguage(entry) {
  return entry.translation?.targetLanguage || state.settings.targetLanguage;
}

function renderLatest() {
  const latest = state.history[0];
  elements.copyLatest.disabled = !latest?.translation?.text;
  if (!latest) {
    elements.latestResult.className = 'latest-body empty';
    elements.latestResult.textContent = 'No captures yet.';
    return;
  }

  elements.latestResult.className = 'latest-body';
  elements.latestResult.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = textPreview(latest);
  const meta = document.createElement('p');
  meta.className = `muted ${statusClass(latest)}`;
  meta.textContent = `${languagePairLabel(latest.detectedLanguage, entryTargetLanguage(latest))} - ${latest.status}`;
  elements.latestResult.append(title, meta);
}

function uniqueLanguages(history) {
  const languages = new Map();
  for (const entry of history) {
    const code = normalizeLanguageCode(entry.detectedLanguage);
    if (code) {
      languages.set(code, languageName(code));
    }
  }
  return [...languages.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

function renderFilters() {
  const current = elements.languageFilter.value;
  elements.languageFilter.innerHTML = '<option value="">Any language</option>';
  for (const [code, name] of uniqueLanguages(state.history)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    elements.languageFilter.append(option);
  }
  elements.languageFilter.value = current;
}

function renderHistoryList() {
  const filtered = filterHistory(state.history, state.filters);
  elements.historyList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No matching history entries.';
    elements.historyList.append(empty);
    return;
  }

  for (const entry of filtered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.dataset.id = entry.id;
    button.setAttribute('aria-selected', String(entry.id === state.selectedId));
    button.setAttribute('aria-expanded', String(entry.id === state.selectedId));

    const image = document.createElement('img');
    image.className = 'thumb';
    image.alt = '';
    image.src = entry.image?.thumbnailDataUrl || '';

    const main = document.createElement('div');
    main.className = 'item-main';
    const title = document.createElement('h3');
    title.className = 'item-title';
    title.textContent = textPreview(entry);
    const source = document.createElement('div');
    source.className = 'item-text muted';
    source.textContent = entry.source?.tabTitle || entry.source?.tabUrl || 'Captured tab';
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const metaItems = [
      entry.favorite ? { text: 'Favorite' } : null,
      { text: entry.status, className: statusClass(entry) },
      { text: languageName(entry.detectedLanguage) },
      { text: shortDate(entry.createdAt) }
    ].filter(Boolean);
    for (const item of metaItems) {
      const span = document.createElement('span');
      span.textContent = item.text;
      if (item.className) {
        span.className = item.className;
      }
      meta.append(span);
    }

    main.append(title, source, meta);
    button.append(image, main);
    button.addEventListener('click', () => {
      const nextSelectedId = nextSelectedHistoryId(state.selectedId, entry.id);
      if (nextSelectedId !== state.selectedId) {
        state.countryQuery = '';
      }
      state.selectedId = nextSelectedId;
      render();
    });
    elements.historyList.append(button);
  }
}

function textarea(label, value) {
  const block = document.createElement('label');
  block.className = 'text-block';
  const span = document.createElement('span');
  span.className = 'muted';
  span.textContent = label;
  const area = document.createElement('textarea');
  area.readOnly = true;
  area.value = value || '';
  block.append(span, area);
  return block;
}

function renderCountryList(list, language, query) {
  const countries = filterPrimaryLanguageCountries(language, query);
  list.innerHTML = '';

  if (countries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No countries found.';
    list.append(empty);
    return;
  }

  for (const country of countries) {
    const item = document.createElement('span');
    item.className = 'country-pill';
    item.textContent = country;
    list.append(item);
  }
}

function countrySearch(entry) {
  const section = document.createElement('section');
  section.className = 'country-panel';

  const heading = document.createElement('h3');
  heading.textContent = `Primary countries: ${languageName(entry.detectedLanguage)}`;

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search countries';
  input.value = state.countryQuery;

  const list = document.createElement('div');
  list.className = 'country-list';
  renderCountryList(list, entry.detectedLanguage, state.countryQuery);

  input.addEventListener('input', (event) => {
    state.countryQuery = event.target.value;
    renderCountryList(list, entry.detectedLanguage, state.countryQuery);
  });

  section.append(heading, input, list);
  return section;
}

function renderDetails() {
  const entry = state.history.find((item) => item.id === state.selectedId);
  elements.detailActions.innerHTML = '';
  elements.detailView.innerHTML = '';

  if (!entry) {
    elements.detailView.className = 'detail-view empty';
    elements.detailView.textContent = 'Select a history entry.';
    return;
  }

  elements.detailView.className = 'detail-view';
  const favorite = document.createElement('button');
  favorite.type = 'button';
  favorite.textContent = entry.favorite ? 'Unfavorite' : 'Favorite';
  favorite.addEventListener('click', () => send(MESSAGES.TOGGLE_FAVORITE, { id: entry.id }));

  const retryTranslation = document.createElement('button');
  retryTranslation.type = 'button';
  retryTranslation.textContent = 'Retry Translation';
  retryTranslation.disabled = !entry.ocr?.text;
  retryTranslation.addEventListener('click', () => send(MESSAGES.RETRY_TRANSLATION, { id: entry.id }));

  const retryOcr = document.createElement('button');
  retryOcr.type = 'button';
  retryOcr.textContent = 'Retry OCR';
  retryOcr.disabled = !entry.image?.originalDataUrl;
  retryOcr.addEventListener('click', () => send(MESSAGES.RETRY_OCR, { id: entry.id }));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'danger-button';
  remove.textContent = 'Delete';
  remove.addEventListener('click', () => send(MESSAGES.DELETE_ENTRY, { id: entry.id }));

  elements.detailActions.append(favorite, retryTranslation, retryOcr, remove);

  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  const image = document.createElement('img');
  image.alt = 'Captured region preview';
  image.src = entry.image?.thumbnailDataUrl || '';

  const meta = document.createElement('p');
  meta.className = `muted ${statusClass(entry)}`;
  meta.textContent = `${languagePairLabel(entry.detectedLanguage, entryTargetLanguage(entry))} - ${shortDate(entry.createdAt)} - ${entry.status}`;

  const source = document.createElement('p');
  source.className = 'muted';
  source.textContent = entry.source?.tabTitle || entry.source?.tabUrl || 'Captured tab';

  grid.append(
    image,
    meta,
    source,
    countrySearch(entry),
    textarea('OCR text', entry.ocr?.text),
    textarea('Translation', entry.translation?.text),
    textarea('Error', entry.error?.message)
  );
  elements.detailView.append(grid);
}

function render() {
  renderKeyStatus();
  renderLatest();
  renderFilters();
  renderHistoryList();
  renderDetails();
}

async function copyText(text) {
  if (!text) {
    return;
  }
  await navigator.clipboard.writeText(text);
}

elements.openOptions.addEventListener('click', () => send(MESSAGES.OPEN_OPTIONS));
elements.copyLatest.addEventListener('click', () => copyText(state.history[0]?.translation?.text));
elements.search.addEventListener('input', (event) => {
  state.filters.query = event.target.value;
  render();
});
elements.languageFilter.addEventListener('change', (event) => {
  state.filters.detectedLanguage = event.target.value;
  render();
});
elements.favoritesOnly.addEventListener('change', (event) => {
  state.filters.favoritesOnly = event.target.checked;
  render();
});
elements.clearNonFavorites.addEventListener('click', () => send(MESSAGES.CLEAR_NON_FAVORITES));
elements.clearAll.addEventListener('click', () => send(MESSAGES.CLEAR_ALL));

browser.runtime.onMessage.addListener((message) => {
  if (message?.type === MESSAGES.HISTORY_CHANGED || message?.type === MESSAGES.SETTINGS_CHANGED) {
    loadState();
  }
});

loadState();
