import test from 'node:test';
import assert from 'node:assert/strict';

test('toolbar button toggles the sidebar when Firefox exposes a toggle API', async () => {
  const previousBrowser = globalThis.browser;
  let toolbarClick;
  const calls = [];

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
    sidebarAction: {
      async open() {
        calls.push('open');
      },
      async toggle() {
        calls.push('toggle');
      }
    }
  };

  try {
    await import(`../src/background/background.js?toolbar-sidebar=${Date.now()}`);

    assert.equal(typeof toolbarClick, 'function');
    toolbarClick();
    await Promise.resolve();

    assert.deepEqual(calls, ['toggle']);
  } finally {
    if (previousBrowser === undefined) {
      delete globalThis.browser;
    } else {
      globalThis.browser = previousBrowser;
    }
  }
});
