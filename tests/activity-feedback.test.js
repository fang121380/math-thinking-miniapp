const test = require('node:test');
const assert = require('node:assert/strict');

const { activityMessage } = require('../miniprogram/utils/activity-feedback');

test('activity errors use child-friendly messages with a recovery action', () => {
  assert.match(activityMessage('load_failed'), /重试/);
  assert.match(activityMessage('save_failed'), /再试/);
  assert.match(activityMessage('navigation_failed'), /再点/);
  assert.match(activityMessage('hint_unavailable'), /重来/);
});

test('game validation errors explain the exact next step', () => {
  assert.match(activityMessage('invalid_puzzle_move'), /空格旁边/);
  assert.match(activityMessage('pattern_unselected'), /先选/);
  assert.match(activityMessage('partition_count', { difference: 2 }), /还要选 2 格/);
  assert.match(activityMessage('partition_count', { difference: -1 }), /多选了 1 格/);
  assert.match(activityMessage('selected_disconnected'), /选中的格子/);
  assert.match(activityMessage('remaining_disconnected'), /没选的格子/);
});

test('interactive game modes give a concrete recovery hint', () => {
  assert.match(activityMessage('construct_unfinished'), /令牌/);
  assert.match(activityMessage('construct_wrong'), /顺序/);
  assert.match(activityMessage('matching_wrong'), /重新/);
  assert.match(activityMessage('route_wrong'), /这一关/);
  assert.match(activityMessage('game_review_round'), /复习/);
});

test('unknown activity errors fall back without exposing technical details', () => {
  const message = activityMessage('unexpected_sdk_error');
  assert.equal(message, '这一步没有完成，请再试一次');
  assert.doesNotMatch(message, /error|exception|sdk/i);
});
