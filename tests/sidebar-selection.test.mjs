import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSelectedHistoryId } from '../src/sidebar/selection.js';

test('nextSelectedHistoryId collapses details when the selected entry is clicked again', () => {
  assert.equal(nextSelectedHistoryId('entry-1', 'entry-1'), null);
});

test('nextSelectedHistoryId selects a clicked entry when nothing is open', () => {
  assert.equal(nextSelectedHistoryId(null, 'entry-1'), 'entry-1');
});

test('nextSelectedHistoryId switches details when a different entry is clicked', () => {
  assert.equal(nextSelectedHistoryId('entry-1', 'entry-2'), 'entry-2');
});
