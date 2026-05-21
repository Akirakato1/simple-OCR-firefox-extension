import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('sidebar document loads external panel theme bootstrap before stylesheet', async () => {
  const html = await readFile(new URL('../src/sidebar/sidebar.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../src/sidebar/theme-bootstrap.js', import.meta.url), 'utf8');
  const themeBootstrapIndex = html.indexOf('data-panel-theme-bootstrap');
  const stylesheetIndex = html.indexOf('<link rel="stylesheet" href="sidebar.css">');

  assert.ok(themeBootstrapIndex > -1);
  assert.ok(stylesheetIndex > -1);
  assert.ok(themeBootstrapIndex < stylesheetIndex);
  assert.match(html, /src="theme-bootstrap\.js"/);
  assert.doesNotMatch(html, /new URLSearchParams\(location\.search\)/);
  assert.match(script, /new URLSearchParams\(location\.search\)/);
  assert.match(script, /document\.documentElement\.dataset\.theme = theme/);
});
