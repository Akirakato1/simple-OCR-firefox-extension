export async function openExtensionShortcutSettings(browserApi = browser) {
  const openShortcutSettings = browserApi?.commands?.openShortcutSettings;

  if (typeof openShortcutSettings !== 'function') {
    return {
      ok: false,
      error: 'This Firefox version does not support opening extension shortcut settings from an extension.'
    };
  }

  try {
    await openShortcutSettings.call(browserApi.commands);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'Could not open extension shortcut settings.'
    };
  }
}
