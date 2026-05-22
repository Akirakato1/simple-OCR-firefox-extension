import { HISTORY_KEY, SETTINGS_KEY } from '../shared/constants.js';

export function shouldReloadForStorageChange(changes = {}, areaName = '') {
  if (areaName !== 'local') {
    return false;
  }
  return Boolean(changes[HISTORY_KEY] || changes[SETTINGS_KEY]);
}
