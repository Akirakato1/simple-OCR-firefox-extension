(function installUiPanelOverlay() {
  if (window.__tabOcrTranslatePanelLoaded) {
    return;
  }
  window.__tabOcrTranslatePanelLoaded = true;

  const MESSAGE_OPEN_PANEL = 'open-panel';
  const MESSAGE_TOGGLE_PANEL = 'toggle-panel';
  const MESSAGE_CLOSE_PANEL = 'close-panel';
  const MESSAGE_SET_PANEL_VISIBILITY = 'set-panel-visibility';
  const MESSAGE_SOURCE = 'tab-ocr-translate';
  const SETTINGS_KEY = 'settings';
  const PANEL_ID = 'tab-ocr-translate-panel-root';
  const PANEL_PATH = 'src/sidebar/sidebar.html';
  const OPEN_TRANSITION_MS = 180;

  let panel = null;
  let closeTimer = null;

  function normalizePanelSide(value) {
    const side = String(value || '').trim().toLowerCase();
    return side === 'left' || side === 'right' ? side : 'right';
  }

  function normalizePanelTheme(value) {
    const theme = String(value || '').trim().toLowerCase();
    return theme === 'light' || theme === 'discord-dark' || theme === 'system' ? theme : 'system';
  }

  function panelBackgroundColor(theme) {
    const normalized = normalizePanelTheme(theme);
    if (normalized === 'light') {
      return '#f7f8fa';
    }
    if (normalized === 'discord-dark') {
      return '#313338';
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? '#313338' : '#f7f8fa';
  }

  function panelUrl(theme) {
    const params = new URLSearchParams({
      surface: 'panel',
      theme: normalizePanelTheme(theme)
    });
    return `${PANEL_PATH}?${params.toString()}`;
  }

  function closedTransform(side) {
    return side === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  }

  function applyPanelSide(root, side) {
    const normalized = normalizePanelSide(side);
    root.dataset.side = normalized;
    root.style.left = normalized === 'left' ? '0' : '';
    root.style.right = normalized === 'right' ? '0' : '';
    root.style.borderLeft = '0';
    root.style.borderRight = '0';
  }

  function applyPanelTheme(root, frame, theme) {
    const normalized = normalizePanelTheme(theme);
    const background = panelBackgroundColor(normalized);
    root.dataset.theme = normalized;
    root.style.background = background;
    if (frame) {
      frame.style.background = background;
    }
  }

  function revealPanel(root, frame) {
    requestAnimationFrame(() => {
      if (panel?.root === root) {
        root.style.visibility = 'visible';
        frame.style.opacity = '1';
        requestAnimationFrame(() => {
          if (panel?.root === root) {
            root.style.transform = 'translateX(0)';
          }
        });
      }
    });
  }

  function removeClosingPanel() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    document.getElementById(PANEL_ID)?.remove();
  }

  function openPanel(side, theme) {
    const normalized = normalizePanelSide(side);
    if (panel) {
      applyPanelSide(panel.root, normalized);
      applyPanelTheme(panel.root, panel.frame, theme);
      panel.root.style.visibility = 'visible';
      panel.root.style.pointerEvents = 'auto';
      return { ok: true };
    }

    removeClosingPanel();

    const root = document.createElement('div');
    root.id = PANEL_ID;
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-label', 'OCR Translate panel');
    root.style.position = 'fixed';
    root.style.top = '0';
    root.style.bottom = '0';
    root.style.width = 'min(420px, calc(100vw - 32px))';
    root.style.maxWidth = '420px';
    root.style.zIndex = '2147483646';
    root.style.background = panelBackgroundColor(theme);
    root.style.boxShadow = '0 16px 44px rgba(15, 23, 42, 0.28)';
    root.style.transition = `transform ${OPEN_TRANSITION_MS}ms cubic-bezier(0.2, 0, 0, 1)`;
    root.style.transform = closedTransform(normalized);
    root.style.visibility = 'hidden';
    root.style.pointerEvents = 'auto';
    root.style.willChange = 'transform';
    root.style.colorScheme = 'light dark';

    const frame = document.createElement('iframe');
    frame.title = 'OCR Translate';
    frame.style.display = 'block';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.background = panelBackgroundColor(theme);
    frame.style.opacity = '0';
    frame.style.transition = 'opacity 90ms ease';
    frame.addEventListener('load', () => revealPanel(root, frame), { once: true });
    frame.src = browser.runtime.getURL(panelUrl(theme));

    root.append(frame);
    applyPanelSide(root, normalized);
    applyPanelTheme(root, frame, theme);
    document.documentElement.append(root);
    panel = { root, frame };

    return { ok: true };
  }

  function closePanel() {
    if (!panel) {
      return { ok: true };
    }

    const root = panel.root;
    const side = normalizePanelSide(root.dataset.side);
    panel = null;
    root.style.transform = closedTransform(side);
    root.style.pointerEvents = 'none';

    closeTimer = setTimeout(() => {
      if (root.parentNode) {
        root.remove();
      }
      closeTimer = null;
    }, OPEN_TRANSITION_MS);

    return { ok: true };
  }

  function togglePanel(side, theme) {
    return panel ? closePanel() : openPanel(side, theme);
  }

  function setPanelVisibility(hidden) {
    if (!panel) {
      return { ok: true };
    }
    panel.root.style.visibility = hidden ? 'hidden' : 'visible';
    panel.root.style.pointerEvents = hidden ? 'none' : 'auto';
    return { ok: true };
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === MESSAGE_OPEN_PANEL) {
      return Promise.resolve(openPanel(message.side, message.theme));
    }
    if (message?.type === MESSAGE_TOGGLE_PANEL) {
      return Promise.resolve(togglePanel(message.side, message.theme));
    }
    if (message?.type === MESSAGE_SET_PANEL_VISIBILITY) {
      return Promise.resolve(setPanelVisibility(Boolean(message.hidden)));
    }
    return undefined;
  });

  window.addEventListener('message', (event) => {
    if (!panel || event.source !== panel.frame.contentWindow) {
      return;
    }
    if (event.data?.source === MESSAGE_SOURCE && event.data?.type === MESSAGE_CLOSE_PANEL) {
      closePanel();
    }
  });

  browser.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !panel || !changes[SETTINGS_KEY]) {
      return;
    }
    applyPanelSide(panel.root, changes[SETTINGS_KEY].newValue?.panelSide);
    applyPanelTheme(panel.root, panel.frame, changes[SETTINGS_KEY].newValue?.theme);
  });
})();
