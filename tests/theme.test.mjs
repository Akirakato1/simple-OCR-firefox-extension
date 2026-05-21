import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_OPTIONS,
  normalizeThemePreference,
  themeAttribute,
  themeLabel
} from '../src/shared/theme.js';

test('normalizeThemePreference accepts supported theme values', () => {
  assert.equal(normalizeThemePreference('discord-dark'), 'discord-dark');
  assert.equal(normalizeThemePreference('light'), 'light');
  assert.equal(normalizeThemePreference('SYSTEM'), 'system');
});

test('normalizeThemePreference falls back to system for unknown values', () => {
  assert.equal(normalizeThemePreference('purple-space'), 'system');
  assert.equal(normalizeThemePreference(''), 'system');
});

test('themeAttribute returns stable DOM attributes', () => {
  assert.equal(themeAttribute('discord-dark'), 'discord-dark');
  assert.equal(themeAttribute('light'), 'light');
  assert.equal(themeAttribute('system'), 'system');
});

test('theme options expose labels for settings UI', () => {
  assert.deepEqual(THEME_OPTIONS.map((option) => option.value), ['system', 'light', 'discord-dark']);
  assert.equal(themeLabel('discord-dark'), 'Discord Dark');
});
