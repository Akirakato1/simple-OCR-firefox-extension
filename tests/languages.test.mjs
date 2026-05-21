import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterPrimaryLanguageCountries,
  languageName,
  languagePairLabel,
  normalizeLanguageCode,
  primaryLanguageCountries
} from '../src/shared/languages.js';

test('languageName displays target and detected language codes as full names', () => {
  assert.equal(languageName('EN'), 'English');
  assert.equal(languageName('ko'), 'Korean');
  assert.equal(languageName('KOR'), 'Korean');
  assert.equal(languageName('ZH-CN'), 'Chinese (Simplified)');
  assert.equal(languageName(''), 'Unknown');
});

test('languagePairLabel formats detected and target languages with full names', () => {
  assert.equal(languagePairLabel('KOR', 'EN'), 'Korean -> English');
  assert.equal(languagePairLabel(null, 'JA'), 'Unknown -> Japanese');
});

test('primaryLanguageCountries returns searchable country names for a detected language', () => {
  assert.deepEqual(primaryLanguageCountries('KOR'), ['North Korea', 'South Korea']);
  assert.deepEqual(filterPrimaryLanguageCountries('KOR', 'south'), ['South Korea']);
  assert.deepEqual(filterPrimaryLanguageCountries('KOR', 'zzzz'), []);
});

test('normalizeLanguageCode maps provider aliases to one display code', () => {
  assert.equal(normalizeLanguageCode('spa'), 'ES');
  assert.equal(normalizeLanguageCode('jpn'), 'JA');
  assert.equal(normalizeLanguageCode('chs'), 'ZH-CN');
  assert.equal(normalizeLanguageCode('cht'), 'ZH-TW');
});
