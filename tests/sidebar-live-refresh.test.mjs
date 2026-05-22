import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sidebar listens to storage changes so open panel history refreshes', async () => {
  const js = await readFile(new URL('../src/sidebar/sidebar.js', import.meta.url), 'utf8');

  assert.match(js, /browser\.storage\.onChanged\.addListener/);
  assert.match(js, /shouldReloadForStorageChange/);
});
