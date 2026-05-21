import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

assert.equal(manifest.manifest_version, 2);
assert.equal(manifest.name, 'Tab OCR Translate');
assert.equal(manifest.sidebar_action, undefined);
assert.equal(manifest.options_ui.page, 'src/options/options.html');
assert.equal(manifest.browser_action.default_title, 'Toggle OCR Translate Panel');
assert.equal(manifest.browser_action.browser_style, true);
assert.ok(manifest.background.scripts.includes('src/background/background.js'));
assert.equal(manifest.background.type, 'module');
assert.ok(manifest.web_accessible_resources.includes('src/sidebar/sidebar.html'));
assert.ok(manifest.web_accessible_resources.includes('src/sidebar/sidebar.css'));
assert.ok(manifest.web_accessible_resources.includes('src/sidebar/sidebar.js'));
assert.ok(manifest.permissions.includes('activeTab'));
assert.ok(manifest.permissions.includes('tabs'));
assert.ok(manifest.permissions.includes('storage'));
assert.ok(manifest.permissions.includes('https://api.ocr.space/*'));
assert.ok(manifest.permissions.includes('https://translation.googleapis.com/*'));
assert.ok(manifest.commands['start-ocr-capture']);

console.log('manifest ok');
