# Firefox OCR Translation Extension Design

## Overview

Build a personal-use Firefox WebExtension that lets the user press a configurable hotkey, select a region inside the current browser tab, OCR the selected image through OCR.space, translate the recognized text through DeepL, and review the result in a Firefox sidebar. The extension ships without API keys; the user supplies their own OCR.space and DeepL keys during first-run setup.

The initial product is a no-backend extension. API keys are stored locally in the browser extension storage and used directly by the extension. This is appropriate for personal use, but not for a public release where keys must be protected by a backend proxy.

## Goals

- Start region capture from a configurable Firefox extension shortcut.
- Let the user select a rectangle inside the visible current browser tab.
- Cancel selection cleanly with `Esc`.
- Crop and compress the selected region before OCR.
- Keep OCR.space free-tier compatibility by defaulting to small compressed crops and retrying compression/downscale when needed.
- Send the selected crop to OCR.space for OCR and language detection where available.
- Send OCR text to DeepL for automatic translation into a configurable target language, defaulting to English.
- Open or focus the sidebar automatically after capture.
- Store history entries with thumbnail, OCR text, detected language, translation, timestamp, source page metadata, favorite flag, and retry status.
- Let the user search, inspect, favorite, delete, retry, and manage history from the sidebar.
- Ask for user-owned OCR.space and DeepL API keys on install or first use.

## Non-Goals

- Capture arbitrary desktop regions outside Firefox.
- Build a backend service or hide API keys from the local extension profile.
- Publish a multi-user commercial extension in the first version.
- Perform fully local OCR or fully local translation.
- Save full original crops by default.
- Support PDF/document OCR workflows beyond selected browser-tab screenshots.

## External Services

### OCR.space

The extension uses OCR.space as the OCR provider. OCR.space's documented free API tier supports personal-use volumes well above the expected usage for small browser-tab captures, with limits including a 1 MB file size for free-tier image uploads.

The default OCR request uses `OCREngine=3` with `language=auto` so screenshots containing non-Latin scripts such as Korean use OCR.space's broad language auto-detection path.

Reference: https://ocr.space/OCRAPI

### DeepL

The extension uses DeepL API for translation. The user's own DeepL API key is required. DeepL API Free currently provides a monthly character allowance suitable for personal usage.

Reference: https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-Free

## Firefox WebExtension Capabilities

The design uses standard Firefox WebExtension APIs:

- `commands` for the capture hotkey and access to Firefox's shortcut settings.
- `sidebar_action` for a persistent browser sidebar.
- `tabs.captureVisibleTab()` for capturing the visible area of the active tab.
- `storage.local` for settings and history.
- Content scripts for the in-tab selection overlay.
- Host permissions for OCR.space and DeepL API endpoints.

References:

- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab
- https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage/local

## Architecture

### Background Script

The background script owns orchestration. It listens for the capture command, verifies settings, opens or focuses the sidebar, injects or messages the selection overlay in the active tab, captures the visible tab image, crops and compresses the selected rectangle, calls OCR.space, calls DeepL, and writes result records to storage.

The background script also handles retry requests from the sidebar. OCR retry reuses the saved thumbnail or original crop when available; if only the thumbnail is available and OCR quality may suffer, the UI explains that recapturing is recommended. Translation retry reuses saved OCR text.

### Content Script Overlay

The content script creates a full-page transparent overlay in the active tab. The user drags to draw a selection rectangle. The overlay captures pointer movement, shows the selected region, returns rectangle coordinates in viewport pixels, and removes itself after confirm or cancel.

`Esc` cancels selection and sends a cancellation response without creating a history entry.

### Crop And Compression Module

The crop/compression module receives the captured visible-tab image data URL and viewport rectangle. It draws the image into a canvas, crops the selected rectangle, and encodes the crop as JPEG or WebP. The default quality target is `0.82`.

If the encoded crop is above OCR.space's free-tier image limit, the module tries lower quality and then proportional downscale. If the image still cannot fit, the extension stores an error result and tells the user to select a smaller region.

The module always creates a thumbnail for history. It saves the full original crop only when the setting is enabled.

### Provider Clients

The OCR.space client submits the compressed crop with the user's API key and parses OCR text, detected language data where available, and provider errors.

The DeepL client submits OCR text with the user's API key and selected target language. It parses translated text and detected source language when DeepL returns it. If OCR.space and DeepL report different source languages, the sidebar shows both only if useful. The top-level `detectedLanguage` field prefers DeepL's source language for translated text and keeps OCR metadata separately.

### Sidebar UI

The sidebar is the main extension interface. It includes:

- Latest result panel at the top.
- History list ordered newest first.
- Search and filters for text, detected language, target language, and favorites.
- Entry detail view with thumbnail, OCR text, translation, source title, source URL, timestamp, favorite toggle, copy buttons, retry buttons, and delete button.
- Settings view for API keys, target language, compression behavior, image retention, and max history count.

The sidebar updates automatically when a new capture result is saved.

### Options Page

The options page provides first-run setup and a larger settings surface. On install, or when capture is attempted without required API keys, the extension opens this page and asks the user to enter OCR.space and DeepL API keys.

The options page also includes a shortcut settings button that opens Firefox's extension shortcut settings when supported.

## Data Model

### Settings

```json
{
  "ocrSpaceApiKey": "string",
  "deeplApiKey": "string",
  "targetLanguage": "EN",
  "imageFormat": "image/jpeg",
  "imageQuality": 0.82,
  "maxUploadBytes": 1000000,
  "saveOriginalCrop": false,
  "maxHistoryEntries": 100
}
```

### History Entry

```json
{
  "id": "uuid",
  "createdAt": "ISO-8601 timestamp",
  "favorite": false,
  "status": "complete | ocr_failed | translation_failed | size_failed",
  "detectedLanguage": "string | null",
  "source": {
    "tabTitle": "string",
    "tabUrl": "string"
  },
  "image": {
    "thumbnailDataUrl": "string",
    "originalDataUrl": "string | null",
    "width": 0,
    "height": 0,
    "uploadBytes": 0
  },
  "ocr": {
    "text": "string",
    "detectedLanguage": "string | null",
    "rawProviderLanguage": "string | null"
  },
  "translation": {
    "targetLanguage": "EN",
    "detectedSourceLanguage": "string | null",
    "text": "string"
  },
  "error": {
    "stage": "ocr | translation | compression | settings | null",
    "message": "string | null",
    "retryable": true
  }
}
```

History entries are stored newest first. When `maxHistoryEntries` is exceeded, the extension prunes oldest non-favorite entries first. Favorites are not deleted by automatic pruning unless all entries are favorites and storage is still exhausted; in that case, the sidebar asks the user to clear space manually.

## User Flow

1. User installs extension.
2. Extension opens options page because API keys are missing.
3. User enters OCR.space and DeepL API keys and saves settings.
4. User presses the configured capture shortcut on a browser tab.
5. Extension shows region-selection overlay on the active tab.
6. User drags a rectangle over visible tab content.
7. Extension captures visible tab, crops the selected rectangle, compresses it, and creates a thumbnail.
8. Extension calls OCR.space with the compressed crop.
9. Extension calls DeepL with OCR text and target language.
10. Extension opens or focuses the sidebar.
11. Sidebar shows the latest result and saves it in history.
12. User can copy OCR text or translation, favorite the entry, delete it, retry failed stages, or inspect previous history.

## Error Handling

- Missing API keys: open options page and show a settings-required state in sidebar.
- Unsupported page or failed content script injection: show an error explaining that the tab cannot be captured or overlaid.
- User cancellation: remove overlay and save nothing.
- Crop too large: recompress, downscale, then show a size error if still above `maxUploadBytes`.
- OCR.space rate limit or API error: save an `ocr_failed` entry with retry button.
- Empty OCR text: save result with thumbnail and a message that no text was detected.
- DeepL API error: save OCR result with `translation_failed` status and retry button.
- Storage quota error: ask user to delete old entries or reduce saved images.

## Security And Privacy

The extension sends selected image crops to OCR.space and recognized text to DeepL. It does not upload entire pages unless the user selects an entire visible tab area.

API keys are stored locally in `storage.local`. This avoids shipping any API key with the extension, but local extension storage is not a secure secret vault. This is acceptable for a personal extension and should be revisited before public distribution.

The extension requests only the permissions needed for the MVP: active tab capture, tab metadata, storage, sidebar, commands, and API host access.

## Testing Strategy

### Automated Tests

- Settings validation:
  - missing OCR.space key blocks capture and opens settings.
  - missing DeepL key blocks translation setup.
  - invalid image quality falls back to default.
- Crop/compression:
  - crops the expected rectangle from a known image.
  - creates thumbnails with bounded dimensions.
  - recompresses/downscales until below `maxUploadBytes`.
  - returns a size error when impossible.
- OCR.space client:
  - parses successful OCR responses.
  - parses empty text responses.
  - surfaces rate limit and API-key errors.
- DeepL client:
  - parses successful translation responses.
  - handles detected source language.
  - surfaces quota and API-key errors.
- History storage:
  - saves newest entries first.
  - toggles favorite state.
  - deletes individual entries.
  - clears non-favorites while keeping favorites.
  - prunes oldest non-favorites after `maxHistoryEntries`.

### Manual Tests

- Install extension in Firefox with `web-ext`.
- Confirm first-run setup opens when API keys are missing.
- Save OCR.space and DeepL keys.
- Trigger capture using the default shortcut.
- Draw a region inside a normal web page and confirm automatic sidebar result.
- Press `Esc` during selection and confirm no history entry is created.
- Capture a too-large or image-heavy area and confirm compression/downscale behavior.
- Simulate OCR failure and use retry.
- Simulate translation failure and use retry.
- Favorite, delete, search, filter, and clear history entries.
- Change target language and confirm new captures use it.
- Open Firefox shortcut settings from the extension settings UI.

## Open Decisions Resolved

- OCR provider: OCR.space.
- Translation provider: DeepL.
- Capture scope: current browser tab only.
- API-key model: user-owned keys stored locally, no backend.
- Result behavior: automatic translation with retry.
- Sidebar behavior: open or focus automatically after capture.
- History image storage: thumbnail by default, optional original crop.
