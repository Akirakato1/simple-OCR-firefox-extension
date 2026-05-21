import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

function createElement(tagName) {
  const element = {
    tagName,
    children: [],
    dataset: {},
    style: {},
    parentNode: null,
    attributes: {},
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    append(...children) {
      for (const child of children) {
        child.parentNode = this;
        this.children.push(child);
      }
    },
    remove() {
      if (!this.parentNode) {
        return;
      }
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    dispatchEvent(event) {
      this.listeners[event.type]?.(event);
    },
    querySelector(selector) {
      if (selector !== '[data-tab-ocr-close]') {
        return null;
      }
      const stack = [...this.children];
      while (stack.length > 0) {
        const current = stack.shift();
        if (current.dataset?.tabOcrClose) {
          return current;
        }
        stack.push(...current.children);
      }
      return null;
    }
  };
  return element;
}

async function loadOverlay() {
  const code = await readFile(new URL('../src/content/ui-panel-overlay.js', import.meta.url), 'utf8');
  let messageListener;
  const rafCallbacks = [];
  const documentElement = createElement('html');
  const document = {
    documentElement,
    createElement,
    getElementById(id) {
      return documentElement.children.find((child) => child.id === id) || null;
    }
  };
  const context = {
    window: {
      matchMedia() {
        return { matches: true };
      }
    },
    document,
    browser: {
      runtime: {
        getURL(path) {
          return `moz-extension://example/${path}`;
        },
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          }
        }
      },
      storage: {
        onChanged: {
          addListener() {}
        }
      }
    },
    requestAnimationFrame(callback) {
      rafCallbacks.push(callback);
    },
    URLSearchParams,
    clearTimeout,
    setTimeout
  };

  vm.createContext(context);
  vm.runInContext(code, context);
  return {
    documentElement,
    get root() {
      return document.getElementById('tab-ocr-translate-panel-root');
    },
    send(message) {
      return messageListener(message);
    },
    runAnimationFrame() {
      const callback = rafCallbacks.shift();
      if (callback) {
        callback();
      }
    }
  };
}

test('panel overlay starts hidden offscreen with no edge border or white dark-mode surface', async () => {
  const overlay = await loadOverlay();

  await overlay.send({
    type: 'open-panel',
    side: 'right',
    theme: 'discord-dark'
  });

  assert.equal(overlay.root.style.visibility, 'hidden');
  assert.equal(overlay.root.style.transform, 'translateX(100%)');
  assert.equal(overlay.root.style.borderLeft, '0');
  assert.equal(overlay.root.style.borderRight, '0');
  assert.equal(overlay.root.style.background, '#313338');
  assert.equal(overlay.root.children[0].style.background, '#313338');
  assert.equal(overlay.root.children[0].style.opacity, '0');
  assert.match(overlay.root.children[0].src, /theme=discord-dark/);

  overlay.runAnimationFrame();
  assert.equal(overlay.root.style.visibility, 'hidden');
  assert.equal(overlay.root.style.transform, 'translateX(100%)');

  overlay.root.children[0].dispatchEvent({ type: 'load' });
  assert.equal(overlay.root.style.visibility, 'hidden');

  overlay.runAnimationFrame();
  assert.equal(overlay.root.style.visibility, 'visible');
  assert.equal(overlay.root.children[0].style.opacity, '1');

  overlay.runAnimationFrame();
  assert.equal(overlay.root.style.transform, 'translateX(0)');
});
