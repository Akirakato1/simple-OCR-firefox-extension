import test from 'node:test';
import assert from 'node:assert/strict';
import { openExtensionShortcutSettings } from '../src/background/shortcuts.js';

test('openExtensionShortcutSettings uses Firefox commands shortcut API', async () => {
  let called = false;
  const browserApi = {
    commands: {
      async openShortcutSettings() {
        called = true;
      }
    }
  };

  const result = await openExtensionShortcutSettings(browserApi);

  assert.equal(called, true);
  assert.deepEqual(result, { ok: true });
});

test('openExtensionShortcutSettings reports unsupported browsers clearly', async () => {
  const result = await openExtensionShortcutSettings({ commands: {} });

  assert.equal(result.ok, false);
  assert.match(result.error, /does not support/);
});

test('openExtensionShortcutSettings returns rejection messages', async () => {
  const browserApi = {
    commands: {
      async openShortcutSettings() {
        throw new Error('User gesture required');
      }
    }
  };

  const result = await openExtensionShortcutSettings(browserApi);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'User gesture required');
});
