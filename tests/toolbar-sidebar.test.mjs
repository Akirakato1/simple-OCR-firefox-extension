import test from 'node:test';
import assert from 'node:assert/strict';

test('toolbar button toggles the in-tab panel on the active tab using the saved side', async () => {
  const previousBrowser = globalThis.browser;
  const previousConsoleError = console.error;
  let toolbarClick;
  const calls = [];
  console.error = () => {};

  globalThis.browser = {
    browserAction: {
      onClicked: {
        addListener(listener) {
          toolbarClick = listener;
        }
      }
    },
    commands: {
      onCommand: {
        addListener() {}
      }
    },
    runtime: {
      onInstalled: {
        addListener() {}
      },
      onMessage: {
        addListener() {}
      },
      async openOptionsPage() {}
    },
    storage: {
      local: {
        async get() {
          return {
            settings: {
              panelSide: 'left'
            }
          };
        }
      }
    },
    tabs: {
      async query(query) {
        calls.push(['query', query]);
        return [{ id: 7, windowId: 12, title: 'Example', url: 'https://example.com' }];
      },
      async executeScript(tabId, details) {
        calls.push(['executeScript', tabId, details]);
      },
      async sendMessage(tabId, message) {
        calls.push(['sendMessage', tabId, message]);
        return { ok: true };
      }
    }
  };

  try {
    await import(`../src/background/background.js?toolbar-panel=${Date.now()}`);

    assert.equal(typeof toolbarClick, 'function');
    await toolbarClick();
    await Promise.resolve();

    assert.deepEqual(calls, [
      ['query', { active: true, currentWindow: true }],
      ['executeScript', 7, { file: '/src/content/ui-panel-overlay.js', runAt: 'document_idle' }],
      ['sendMessage', 7, { type: 'toggle-panel', side: 'left', theme: 'system' }]
    ]);
  } finally {
    console.error = previousConsoleError;
    if (previousBrowser === undefined) {
      delete globalThis.browser;
    } else {
      globalThis.browser = previousBrowser;
    }
  }
});
