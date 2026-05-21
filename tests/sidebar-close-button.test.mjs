import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('panel close button lives inside the sidebar UI and posts a close request', async () => {
  const html = await readFile(new URL('../src/sidebar/sidebar.html', import.meta.url), 'utf8');
  const js = await readFile(new URL('../src/sidebar/sidebar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/sidebar/sidebar.css', import.meta.url), 'utf8');

  assert.match(html, /id="close-panel"/);
  assert.match(html, /aria-label="Close panel"/);
  assert.match(js, /window\.parent\.postMessage/);
  assert.match(js, /MESSAGES\.CLOSE_PANEL/);
  assert.match(css, /\.panel-close-button/);
});
