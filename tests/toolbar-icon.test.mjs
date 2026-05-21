import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('toolbar icon is a transparent teal capital O SVG', async () => {
  const svg = await readFile(new URL('../icons/ocr-o.svg', import.meta.url), 'utf8');

  assert.match(svg, /<svg[^>]+viewBox="0 0 64 64"/);
  assert.match(svg, />O</);
  assert.match(svg, /fill="#14b8a6"/);
  assert.doesNotMatch(svg, /<rect/i);
});
