import test from 'node:test';
import assert from 'node:assert/strict';
import { nextHistoryPanelState, nextSelectedHistoryId } from '../src/sidebar/selection.js';

test('nextSelectedHistoryId collapses details when the selected entry is clicked again', () => {
  assert.equal(nextSelectedHistoryId('entry-1', 'entry-1'), null);
});

test('nextSelectedHistoryId selects a clicked entry when nothing is open', () => {
  assert.equal(nextSelectedHistoryId(null, 'entry-1'), 'entry-1');
});

test('nextSelectedHistoryId switches details when a different entry is clicked', () => {
  assert.equal(nextSelectedHistoryId('entry-1', 'entry-2'), 'entry-2');
});

test('nextHistoryPanelState opens clicked entries inline', () => {
  assert.deepEqual(nextHistoryPanelState({ selectedId: null, closingId: null }, 'entry-1'), {
    selectedId: 'entry-1',
    closingId: null
  });
});

test('nextHistoryPanelState marks the selected entry as closing when clicked again', () => {
  assert.deepEqual(nextHistoryPanelState({ selectedId: 'entry-1', closingId: null }, 'entry-1'), {
    selectedId: null,
    closingId: 'entry-1'
  });
});

test('nextHistoryPanelState switches entries without keeping stale closing panels', () => {
  assert.deepEqual(nextHistoryPanelState({ selectedId: 'entry-1', closingId: 'entry-3' }, 'entry-2'), {
    selectedId: 'entry-2',
    closingId: null
  });
});
