(function installUiPanelOverlay() {
  if (window.__tabOcrTranslatePanelLoaded) {
    return;
  }
  window.__tabOcrTranslatePanelLoaded = true;

  const MESSAGE_OPEN_PANEL = 'open-panel';
  const MESSAGE_TOGGLE_PANEL = 'toggle-panel';
  const MESSAGE_SET_PANEL_VISIBILITY = 'set-panel-visibility';
  const SETTINGS_KEY = 'settings';
  const PANEL_ID = 'tab-ocr-translate-panel-root';
  const PANEL_URL = 'src/sidebar/sidebar.html?surface=panel';
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

  function closedTransform(side) {
    return side === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
  }

  function setCloseButtonSide(button, side) {
    button.style.left = side === 'right' ? '-38px' : '';
    button.style.right = side === 'left' ? '-38px' : '';
  }

  function applyPanelSide(root, side) {
    const normalized = normalizePanelSide(side);
    root.dataset.side = normalized;
    root.style.left = normalized === 'left' ? '0' : '';
    root.style.right = normalized === 'right' ? '0' : '';
    root.style.borderLeft = '0';
    root.style.borderRight = '0';

    const closeButton = root.querySelector('[data-tab-ocr-close]');
    if (closeButton) {
      setCloseButtonSide(closeButton, normalized);
    }
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
    frame.src = browser.runtime.getURL(PANEL_URL);
    frame.style.display = 'block';
    frame.style.width = '100%';
    frame.style.height = '100%';
    frame.style.border = '0';
    frame.style.background = panelBackgroundColor(theme);

    const close = document.createElement('button');
    close.type = 'button';
    close.dataset.tabOcrClose = 'true';
    close.title = 'Close OCR Translate panel';
    close.setAttribute('aria-label', 'Close OCR Translate panel');
    close.textContent = 'x';
    close.style.position = 'absolute';
    close.style.top = '10px';
    close.style.width = '30px';
    close.style.height = '30px';
    close.style.border = '1px solid rgba(255, 255, 255, 0.18)';
    close.style.borderRadius = '8px';
    close.style.background = '#2b2d31';
    close.style.color = '#f2f3f5';
    close.style.cursor = 'pointer';
    close.style.font = '20px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    close.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.24)';
    close.style.zIndex = '1';
    close.addEventListener('click', closePanel);

    root.append(frame, close);
    applyPanelSide(root, normalized);
    applyPanelTheme(root, frame, theme);
    document.documentElement.append(root);
    panel = { root, frame };

    requestAnimationFrame(() => {
      if (panel?.root === root) {
        root.style.visibility = 'visible';
        requestAnimationFrame(() => {
          if (panel?.root === root) {
            root.style.transform = 'translateX(0)';
          }
        });
      }
    });

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

  browser.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !panel || !changes[SETTINGS_KEY]) {
      return;
    }
    applyPanelSide(panel.root, changes[SETTINGS_KEY].newValue?.panelSide);
    applyPanelTheme(panel.root, panel.frame, changes[SETTINGS_KEY].newValue?.theme);
  });
})();
