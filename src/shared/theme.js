export const THEME_OPTIONS = Object.freeze([
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'discord-dark', label: 'Discord Dark' }
]);

const THEME_VALUES = new Set(THEME_OPTIONS.map((option) => option.value));

export function normalizeThemePreference(value) {
  const theme = String(value || '').trim().toLowerCase();
  return THEME_VALUES.has(theme) ? theme : 'system';
}

export function themeAttribute(value) {
  return normalizeThemePreference(value);
}

export function themeLabel(value) {
  const theme = normalizeThemePreference(value);
  return THEME_OPTIONS.find((option) => option.value === theme)?.label || 'System';
}

export function applyTheme(root, value) {
  root.dataset.theme = themeAttribute(value);
}
