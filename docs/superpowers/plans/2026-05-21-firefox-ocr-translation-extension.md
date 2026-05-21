# Firefox OCR Translation Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Firefox WebExtension that captures a selected browser-tab region, sends it to OCR.space, translates OCR text with DeepL, and manages results in a sidebar history.

**Architecture:** Use a Manifest V2 Firefox WebExtension with a module background script, content-script selection overlay, sidebar UI, options UI, and shared ES modules for settings, history, provider parsing, and image helpers. Keep automated tests in Node's built-in test runner so the project has no install-time dependency downloads.

**Tech Stack:** Firefox WebExtensions, plain HTML/CSS/JavaScript ES modules, Node 22 `node:test`, OCR.space API, DeepL API.

---

## File Structure

- `package.json`: project metadata and scripts for automated tests and manifest validation.
- `.gitignore`: ignore dependency folders, build artifacts, and temporary Superpowers visual files.
- `manifest.json`: Firefox extension manifest with sidebar, commands, background script, permissions, and options page.
- `src/shared/constants.js`: default settings, status values, and runtime message names.
- `src/shared/settings.js`: settings normalization and API-key validation.
- `src/shared/history.js`: history entry creation, pruning, favorites, delete, and filtering.
- `src/shared/image.js`: data URL byte estimation, rectangle normalization, and compression-step planning.
- `src/shared/providers/ocr-space.js`: OCR.space request construction and response parsing.
- `src/shared/providers/deepl.js`: DeepL request construction and response parsing.
- `src/background/background.js`: command listener, setup flow, selection orchestration, tab capture, provider calls, retry handling, and storage writes.
- `src/background/capture.js`: browser canvas crop/compression helpers used by the background script.
- `src/content/selection-overlay.js`: injected page overlay for drag selection and `Esc` cancellation.
- `src/sidebar/sidebar.html`: sidebar shell.
- `src/sidebar/sidebar.css`: sidebar styling.
- `src/sidebar/sidebar.js`: sidebar rendering, history actions, retry actions, copy actions, settings shortcut.
- `src/options/options.html`: full settings page.
- `src/options/options.css`: options page styling.
- `src/options/options.js`: first-run setup and settings persistence.
- `scripts/validate-manifest.mjs`: local manifest sanity checks.
- `tests/settings.test.mjs`: settings tests.
- `tests/history.test.mjs`: history tests.
- `tests/image.test.mjs`: pure image-helper tests.
- `tests/providers.test.mjs`: OCR.space and DeepL parser tests.

## Task 1: Project Scaffold And Manifest

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `manifest.json`
- Create: `scripts/validate-manifest.mjs`

- [ ] **Step 1: Write manifest validation script first**

Create `scripts/validate-manifest.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

assert.equal(manifest.manifest_version, 2);
assert.equal(manifest.name, 'Tab OCR Translate');
assert.equal(manifest.sidebar_action.default_panel, 'src/sidebar/sidebar.html');
assert.equal(manifest.options_ui.page, 'src/options/options.html');
assert.ok(manifest.background.scripts.includes('src/background/background.js'));
assert.equal(manifest.background.type, 'module');
assert.ok(manifest.permissions.includes('activeTab'));
assert.ok(manifest.permissions.includes('tabs'));
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.permissions.includes('https://api.ocr.space/*'));
assert.ok(manifest.permissions.includes('https://api-free.deepl.com/*'));
assert.ok(manifest.commands['start-ocr-capture']);

console.log('manifest ok');
```

- [ ] **Step 2: Run validator to verify it fails before manifest exists**

Run: `node scripts/validate-manifest.mjs`

Expected: FAIL with `ENOENT` for `manifest.json`.

- [ ] **Step 3: Create scaffold files**

Create `package.json`:

```json
{
  "name": "firefox-plugin-ocr",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "validate:manifest": "node scripts/validate-manifest.mjs",
    "check": "npm run validate:manifest && npm test"
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
web-ext-artifacts/
.superpowers/
*.zip
```

Create `manifest.json`:

```json
{
  "manifest_version": 2,
  "name": "Tab OCR Translate",
  "version": "0.1.0",
  "description": "Select a browser-tab region, OCR it with OCR.space, translate it with DeepL, and manage results in a sidebar.",
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "https://api.ocr.space/*",
    "https://api-free.deepl.com/*"
  ],
  "background": {
    "scripts": ["src/background/background.js"],
    "persistent": false,
    "type": "module"
  },
  "sidebar_action": {
    "default_title": "OCR Translate",
    "default_panel": "src/sidebar/sidebar.html",
    "open_at_install": true
  },
  "options_ui": {
    "page": "src/options/options.html",
    "open_in_tab": true
  },
  "commands": {
    "start-ocr-capture": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Select a tab region for OCR and translation"
    }
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "tab-ocr-translate@example.local",
      "strict_min_version": "109.0"
    }
  }
}
```

- [ ] **Step 4: Verify manifest validation passes**

Run: `npm run validate:manifest`

Expected: PASS with `manifest ok`.

- [ ] **Step 5: Commit scaffold**

Run:

```bash
git add package.json .gitignore manifest.json scripts/validate-manifest.mjs
git commit -m "chore: scaffold Firefox extension manifest"
```

## Task 2: Settings And History Core

**Files:**
- Create: `src/shared/constants.js`
- Create: `src/shared/settings.js`
- Create: `src/shared/history.js`
- Create: `tests/settings.test.mjs`
- Create: `tests/history.test.mjs`

- [ ] **Step 1: Write failing settings tests**

Create `tests/settings.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/shared/constants.js';
import { normalizeSettings, hasRequiredApiKeys } from '../src/shared/settings.js';

test('normalizeSettings fills defaults and clamps image quality', () => {
  const settings = normalizeSettings({ imageQuality: 7, targetLanguage: 'ja' });
  assert.equal(settings.targetLanguage, 'JA');
  assert.equal(settings.imageQuality, DEFAULT_SETTINGS.imageQuality);
  assert.equal(settings.maxHistoryEntries, DEFAULT_SETTINGS.maxHistoryEntries);
});

test('hasRequiredApiKeys requires non-empty OCR.space and DeepL keys', () => {
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', deeplApiKey: 'deepl' }), true);
  assert.equal(hasRequiredApiKeys({ ocrSpaceApiKey: 'ocr', deeplApiKey: ' ' }), false);
});
```

- [ ] **Step 2: Run settings tests to verify missing modules fail**

Run: `node --test tests/settings.test.mjs`

Expected: FAIL with a module-not-found error for `src/shared/constants.js` or `src/shared/settings.js`.

- [ ] **Step 3: Implement constants and settings**

Create `src/shared/constants.js`:

```js
export const DEFAULT_SETTINGS = Object.freeze({
  ocrSpaceApiKey: '',
  deeplApiKey: '',
  targetLanguage: 'EN',
  imageFormat: 'image/jpeg',
  imageQuality: 0.82,
  maxUploadBytes: 1_000_000,
  saveOriginalCrop: false,
  maxHistoryEntries: 100
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
  RETRY_OCR: 'retry-ocr',
  RETRY_TRANSLATION: 'retry-translation',
  DELETE_ENTRY: 'delete-entry',
  TOGGLE_FAVORITE: 'toggle-favorite',
  CLEAR_NON_FAVORITES: 'clear-non-favorites',
  CLEAR_ALL: 'clear-all',
  OPEN_OPTIONS: 'open-options',
  OPEN_SHORTCUTS: 'open-shortcuts'
});
```

Create `src/shared/settings.js`:

```js
import { DEFAULT_SETTINGS } from './constants.js';

export function normalizeSettings(value = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...value };
  const quality = Number(merged.imageQuality);
  const maxUploadBytes = Number(merged.maxUploadBytes);
  const maxHistoryEntries = Number(merged.maxHistoryEntries);

  return {
    ...merged,
    ocrSpaceApiKey: String(merged.ocrSpaceApiKey || '').trim(),
    deeplApiKey: String(merged.deeplApiKey || '').trim(),
    targetLanguage: String(merged.targetLanguage || DEFAULT_SETTINGS.targetLanguage).trim().toUpperCase(),
    imageFormat: merged.imageFormat === 'image/webp' ? 'image/webp' : DEFAULT_SETTINGS.imageFormat,
    imageQuality: quality > 0 && quality <= 1 ? quality : DEFAULT_SETTINGS.imageQuality,
    maxUploadBytes: Number.isInteger(maxUploadBytes) && maxUploadBytes > 0 ? maxUploadBytes : DEFAULT_SETTINGS.maxUploadBytes,
    saveOriginalCrop: Boolean(merged.saveOriginalCrop),
    maxHistoryEntries: Number.isInteger(maxHistoryEntries) && maxHistoryEntries > 0 ? maxHistoryEntries : DEFAULT_SETTINGS.maxHistoryEntries
  };
}

export function hasRequiredApiKeys(settings) {
  const normalized = normalizeSettings(settings);
  return normalized.ocrSpaceApiKey.length > 0 && normalized.deeplApiKey.length > 0;
}
```

- [ ] **Step 4: Run settings tests and verify pass**

Run: `node --test tests/settings.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing history tests**

Create `tests/history.test.mjs`:

```js
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
    detectedLanguage: 'JA',
    source: { tabTitle: 'Example', tabUrl: 'https://example.com' },
    image: { thumbnailDataUrl: 'data:image/jpeg;base64,aaa', width: 20, height: 10, uploadBytes: 12 },
    ocr: { text: 'hola', detectedLanguage: 'spa' },
    translation: { targetLanguage: 'EN', detectedSourceLanguage: 'JA', text: 'Hello' }
  });

  assert.equal(entry.favorite, false);
  assert.equal(entry.status, 'complete');
  assert.equal(entry.detectedLanguage, 'JA');
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
});
```

- [ ] **Step 6: Run history tests to verify missing module fails**

Run: `node --test tests/history.test.mjs`

Expected: FAIL with module-not-found for `src/shared/history.js`.

- [ ] **Step 7: Implement history helpers**

Create `src/shared/history.js` with functions named in the tests. `createHistoryEntry` must fill all fields from the design data model, `pruneHistory` must keep newest entries and protect favorites, `filterHistory` must match OCR text, translation text, source metadata, detected language, target language, and favorites.

- [ ] **Step 8: Run settings and history tests**

Run: `node --test tests/settings.test.mjs tests/history.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit core settings/history**

Run:

```bash
git add src/shared/constants.js src/shared/settings.js src/shared/history.js tests/settings.test.mjs tests/history.test.mjs
git commit -m "feat: add settings and history core"
```

## Task 3: Provider Clients

**Files:**
- Create: `src/shared/providers/ocr-space.js`
- Create: `src/shared/providers/deepl.js`
- Create: `tests/providers.test.mjs`

- [ ] **Step 1: Write failing provider tests**

Create `tests/providers.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOcrSpaceFormData, parseOcrSpaceResponse } from '../src/shared/providers/ocr-space.js';
import { buildDeepLParams, parseDeepLResponse } from '../src/shared/providers/deepl.js';

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

test('buildOcrSpaceFormData includes base64 image and language auto-detect flag', async () => {
  const body = buildOcrSpaceFormData({
    apiKey: 'ocr-key',
    imageDataUrl: 'data:image/jpeg;base64,abc',
    fileName: 'capture.jpg'
  });

  assert.equal(body.get('apikey'), 'ocr-key');
  assert.equal(body.get('isOverlayRequired'), 'false');
  assert.equal(body.get('OCREngine'), '2');
  assert.ok(body.get('base64Image').startsWith('data:image/jpeg;base64,abc'));
});

test('parseDeepLResponse extracts translation and source language', () => {
  const result = parseDeepLResponse({
    translations: [{ detected_source_language: 'JA', text: 'Hello' }]
  });

  assert.equal(result.text, 'Hello');
  assert.equal(result.detectedSourceLanguage, 'JA');
});

test('buildDeepLParams normalizes target language and text', () => {
  const params = buildDeepLParams({ text: ' Bonjour ', targetLanguage: 'en' });
  assert.equal(params.get('text'), 'Bonjour');
  assert.equal(params.get('target_lang'), 'EN');
});
```

- [ ] **Step 2: Run provider tests to verify missing modules fail**

Run: `node --test tests/providers.test.mjs`

Expected: FAIL with module-not-found for provider modules.

- [ ] **Step 3: Implement provider modules**

Create `src/shared/providers/ocr-space.js`:

```js
const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';

function providerMessage(payload) {
  const message = payload?.ErrorMessage || payload?.ErrorDetails || 'OCR.space request failed';
  return Array.isArray(message) ? message.join('; ') : String(message);
}

export function buildOcrSpaceFormData({ apiKey, imageDataUrl, fileName = 'capture.jpg' }) {
  const body = new FormData();
  body.set('apikey', String(apiKey || '').trim());
  body.set('base64Image', imageDataUrl);
  body.set('filetype', fileName.toLowerCase().endsWith('.png') ? 'PNG' : 'JPG');
  body.set('isOverlayRequired', 'false');
  body.set('scale', 'true');
  body.set('detectOrientation', 'true');
  body.set('OCREngine', '2');
  return body;
}

export function parseOcrSpaceResponse(payload) {
  if (!payload || payload.IsErroredOnProcessing) {
    throw new Error(providerMessage(payload));
  }

  const first = Array.isArray(payload.ParsedResults) ? payload.ParsedResults[0] : null;
  const text = String(first?.ParsedText || '').trim();
  const rawProviderLanguage = first?.Language || payload.DetectedLanguage || null;

  return {
    text,
    detectedLanguage: rawProviderLanguage ? String(rawProviderLanguage).toUpperCase() : null,
    rawProviderLanguage
  };
}

export async function runOcrSpace({ fetchImpl = fetch, apiKey, imageDataUrl }) {
  const response = await fetchImpl(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    body: buildOcrSpaceFormData({ apiKey, imageDataUrl })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(providerMessage(payload));
  }
  return parseOcrSpaceResponse(payload);
}
```

Create `src/shared/providers/deepl.js`:

```js
const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate';

export function buildDeepLParams({ text, targetLanguage }) {
  const params = new URLSearchParams();
  params.set('text', String(text || '').trim());
  params.set('target_lang', String(targetLanguage || 'EN').trim().toUpperCase());
  return params;
}

export function parseDeepLResponse(payload) {
  const first = Array.isArray(payload?.translations) ? payload.translations[0] : null;
  if (!first?.text) {
    throw new Error(payload?.message || 'DeepL request failed');
  }
  return {
    text: String(first.text).trim(),
    detectedSourceLanguage: first.detected_source_language || null
  };
}

export async function runDeepL({ fetchImpl = fetch, apiKey, text, targetLanguage }) {
  const body = buildDeepLParams({ text, targetLanguage });
  const response = await fetchImpl(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${String(apiKey || '').trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || 'DeepL request failed');
  }
  return parseDeepLResponse(payload);
}
```

- [ ] **Step 4: Run provider tests**

Run: `node --test tests/providers.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit provider clients**

Run:

```bash
git add src/shared/providers/ocr-space.js src/shared/providers/deepl.js tests/providers.test.mjs
git commit -m "feat: add OCR and translation provider clients"
```

## Task 4: Image Helpers And Browser Capture Module

**Files:**
- Create: `src/shared/image.js`
- Create: `src/background/capture.js`
- Create: `tests/image.test.mjs`

- [ ] **Step 1: Write failing image-helper tests**

Create `tests/image.test.mjs`:

```js
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
```

- [ ] **Step 2: Run image tests to verify missing module fails**

Run: `node --test tests/image.test.mjs`

Expected: FAIL with module-not-found for `src/shared/image.js`.

- [ ] **Step 3: Implement image helpers**

Create `src/shared/image.js` with the four functions from the tests plus `isMeaningfulSelection(rect)` that returns true only for rectangles at least `8x8`.

- [ ] **Step 4: Run image tests**

Run: `node --test tests/image.test.mjs`

Expected: PASS.

- [ ] **Step 5: Implement browser capture module**

Create `src/background/capture.js` with `loadImage`, `drawScaledCrop`, `createThumbnail`, and `cropAndCompressSelection`. The module must use `Image`, `canvas`, `toDataURL`, `estimateDataUrlBytes`, `planNextCompressionAttempt`, and `toThumbnailSize`. It returns `{ imageDataUrl, thumbnailDataUrl, width, height, uploadBytes }` or throws an error with `stage = 'compression'`.

- [ ] **Step 6: Run all automated tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit image helpers**

Run:

```bash
git add src/shared/image.js src/background/capture.js tests/image.test.mjs
git commit -m "feat: add image compression helpers"
```

## Task 5: Selection Overlay

**Files:**
- Create: `src/content/selection-overlay.js`

- [ ] **Step 1: Implement content overlay**

Create `src/content/selection-overlay.js` as an idempotent injected script. It must listen for `browser.runtime.onMessage`, handle `start-selection`, render a full-viewport overlay, track pointer drag coordinates, normalize the selected rectangle, return it with `browser.runtime.sendMessage({ type: 'selection-complete', rect })`, and send `{ type: 'selection-complete', cancelled: true }` on `Esc`.

- [ ] **Step 2: Check syntax**

Run: `node --check src/content/selection-overlay.js`

Expected: PASS with no output.

- [ ] **Step 3: Commit overlay**

Run:

```bash
git add src/content/selection-overlay.js
git commit -m "feat: add tab region selection overlay"
```

## Task 6: Sidebar And Options UI

**Files:**
- Create: `src/sidebar/sidebar.html`
- Create: `src/sidebar/sidebar.css`
- Create: `src/sidebar/sidebar.js`
- Create: `src/options/options.html`
- Create: `src/options/options.css`
- Create: `src/options/options.js`

- [ ] **Step 1: Implement sidebar shell and styles**

Create semantic sidebar HTML with latest result, filters, history list, details pane, and settings shortcut. CSS must use a restrained work-tool layout, compact controls, stable thumbnail dimensions, and no nested cards.

- [ ] **Step 2: Implement sidebar behavior**

Create `src/sidebar/sidebar.js` to load history/settings from `browser.storage.local`, render newest-first entries, filter by query/language/favorites, copy OCR or translation text, send retry/delete/favorite messages to the background script, and refresh on `history-changed`.

- [ ] **Step 3: Implement options page**

Create options HTML/CSS/JS for OCR.space key, DeepL key, target language, image quality, save original crop, max history entries, shortcut settings, and save confirmation. The JS must normalize settings with `normalizeSettings` before saving.

- [ ] **Step 4: Check UI script syntax**

Run:

```bash
node --check src/sidebar/sidebar.js
node --check src/options/options.js
```

Expected: both PASS with no output.

- [ ] **Step 5: Commit UI**

Run:

```bash
git add src/sidebar src/options
git commit -m "feat: add sidebar and options UI"
```

## Task 7: Background Orchestration And Final Verification

**Files:**
- Create: `src/background/background.js`
- Modify: `manifest.json`

- [ ] **Step 1: Implement background orchestration**

Create `src/background/background.js` to:

- open options page on install when keys are missing.
- listen for `commands.onCommand` with `start-ocr-capture`.
- open/focus sidebar with `browser.sidebarAction.open()` from the shortcut user action.
- inject `src/content/selection-overlay.js` with `browser.tabs.executeScript`.
- send the `start-selection` message to the active tab.
- receive `selection-complete`.
- call `browser.tabs.captureVisibleTab`.
- crop/compress with `cropAndCompressSelection`.
- call OCR.space and DeepL.
- create and save history entries.
- handle retry, delete, favorite, clear non-favorites, clear all, open options, and open shortcut settings messages from the sidebar/options UI.

- [ ] **Step 2: Run syntax checks**

Run:

```bash
node --check src/background/background.js
node --check src/background/capture.js
```

Expected: both PASS with no output.

- [ ] **Step 3: Run complete automated checks**

Run: `npm run check`

Expected: PASS with manifest validation and all tests passing.

- [ ] **Step 4: Manual Firefox smoke check**

Load the extension from the project directory in Firefox `about:debugging#/runtime/this-firefox`. Confirm:

- first-run options opens when keys are empty.
- sidebar is available.
- shortcut starts selection on a normal web page.
- `Esc` cancels selection.
- region selection completes and produces a sidebar entry when valid keys are configured.

- [ ] **Step 5: Commit runtime**

Run:

```bash
git add src/background manifest.json
git commit -m "feat: wire capture OCR translation runtime"
```

## Self-Review Checklist

- Spec coverage: every approved design section maps to a task.
- Placeholder scan: this plan contains no unfinished markers or missing implementation steps.
- Type consistency: settings, status names, message names, and history fields match the design spec.
- Test coverage: pure business logic and provider parsing use automated tests; browser-only APIs use syntax checks plus manual Firefox smoke testing.
