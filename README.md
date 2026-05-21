# Tab OCR Translate

A personal Firefox WebExtension for translating text from a selected region of the current browser tab. Use the toolbar button or hotkey, drag over text, and the extension sends the cropped image to OCR.space, translates the detected text with Google Translate, and shows the result in an in-tab panel.

The extension has no backend and ships with no API keys. OCR.space and Google Translate keys are stored locally in Firefox extension storage.

## Features

- Region selection overlay for browser-tab screenshots.
- OCR.space text detection with compressed image uploads.
- Google Translate output into a configurable target language.
- In-tab history panel with search, favorites, delete, retry, and detail views.
- Full language names, detected-language country lookup, dark mode, and left/right panel placement.
- Configurable capture shortcut through Firefox extension shortcut settings.
