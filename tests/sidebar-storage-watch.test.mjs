import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, SETTINGS_KEY } from '../src/shared/constants.js';
import { shouldReloadForStorageChange } from '../src/sidebar/storage-watch.js';

test('shouldReloadForStorageChange refreshes panel for local history updates', () => {
  assert.equal(shouldReloadForStorageChange({
    [HISTORY_KEY]: { oldValue: [], newValue: [{ id: 'new' }] }
  }, 'local'), true);
});

test('shouldReloadForStorageChange refreshes panel for local settings updates', () => {
  assert.equal(shouldReloadForStorageChange({
    [SETTINGS_KEY]: { oldValue: {}, newValue: { theme: 'discord-dark' } }
  }, 'local'), true);
});

test('shouldReloadForStorageChange ignores non-local and unrelated storage changes', () => {
  assert.equal(shouldReloadForStorageChange({ [HISTORY_KEY]: {} }, 'sync'), false);
  assert.equal(shouldReloadForStorageChange({ other: {} }, 'local'), false);
  assert.equal(shouldReloadForStorageChange({}, 'local'), false);
});
