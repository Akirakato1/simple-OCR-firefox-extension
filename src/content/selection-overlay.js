(function installSelectionOverlay() {
  if (window.__tabOcrTranslateOverlayLoaded) {
    return;
  }
  window.__tabOcrTranslateOverlayLoaded = true;

  const MESSAGE_START_SELECTION = 'start-selection';
  const MESSAGE_SELECTION_COMPLETE = 'selection-complete';
  const MINIMUM_SIZE = 8;
  let activeOverlay = null;

  function normalizeRect(startX, startY, endX, endY) {
    return {
      x: Math.round(Math.min(startX, endX)),
      y: Math.round(Math.min(startY, endY)),
      width: Math.round(Math.abs(endX - startX)),
      height: Math.round(Math.abs(endY - startY))
    };
  }

  function sendSelection(payload) {
    browser.runtime.sendMessage({
      type: MESSAGE_SELECTION_COMPLETE,
      ...payload
    });
  }

  function removeOverlay(cancelled = false) {
    if (!activeOverlay) {
      return;
    }
    const { root, onKeyDown } = activeOverlay;
    document.removeEventListener('keydown', onKeyDown, true);
    root.remove();
    activeOverlay = null;
    if (cancelled) {
      sendSelection({ cancelled: true });
    }
  }

  function startSelection() {
    removeOverlay(false);

    const root = document.createElement('div');
    root.setAttribute('role', 'presentation');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '2147483647';
    root.style.cursor = 'crosshair';
    root.style.background = 'rgba(8, 13, 18, 0.18)';
    root.style.userSelect = 'none';

    const box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.border = '2px solid #2f8cff';
    box.style.background = 'rgba(47, 140, 255, 0.16)';
    box.style.boxShadow = '0 0 0 9999px rgba(8, 13, 18, 0.32)';
    box.style.display = 'none';
    box.style.pointerEvents = 'none';

    const hint = document.createElement('div');
    hint.textContent = 'Drag to select text. Esc cancels.';
    hint.style.position = 'fixed';
    hint.style.left = '50%';
    hint.style.top = '16px';
    hint.style.transform = 'translateX(-50%)';
    hint.style.padding = '8px 12px';
    hint.style.borderRadius = '6px';
    hint.style.background = '#101820';
    hint.style.color = '#fff';
    hint.style.font = '13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    hint.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.28)';

    root.append(box, hint);
    document.documentElement.append(root);

    let dragging = false;
    let startX = 0;
    let startY = 0;

    function draw(currentX, currentY) {
      const rect = normalizeRect(startX, startY, currentX, currentY);
      box.style.display = 'block';
      box.style.left = `${rect.x}px`;
      box.style.top = `${rect.y}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
    }

    function finish(currentX, currentY) {
      const rect = normalizeRect(startX, startY, currentX, currentY);
      removeOverlay(false);

      if (rect.width < MINIMUM_SIZE || rect.height < MINIMUM_SIZE) {
        sendSelection({ cancelled: true });
        return;
      }

      sendSelection({
        rect: {
          ...rect,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        }
      });
    }

    function onPointerDown(event) {
      event.preventDefault();
      event.stopPropagation();
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      root.setPointerCapture?.(event.pointerId);
      draw(event.clientX, event.clientY);
    }

    function onPointerMove(event) {
      if (!dragging) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      draw(event.clientX, event.clientY);
    }

    function onPointerUp(event) {
      if (!dragging) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      dragging = false;
      finish(event.clientX, event.clientY);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        removeOverlay(true);
      }
    }

    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('pointermove', onPointerMove, true);
    root.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('keydown', onKeyDown, true);

    activeOverlay = { root, onKeyDown };
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === MESSAGE_START_SELECTION) {
      startSelection();
    }
  });
})();
