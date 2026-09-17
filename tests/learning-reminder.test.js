const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldShowLearningReminder } = require('../miniprogram/utils/learning-reminder');

test('local learning reminder shows once when today has not started', () => {
  const progress = { reminderEnabled: true, dailyCompleted: 0, lastReminderDate: '' };
  assert.equal(shouldShowLearningReminder(progress, '2026-07-15'), true);
  assert.equal(shouldShowLearningReminder({ ...progress, lastReminderDate: '2026-07-15' }, '2026-07-15'), false);
});

test('local learning reminder stays hidden when disabled or work already started', () => {
  assert.equal(shouldShowLearningReminder({ reminderEnabled: false, dailyCompleted: 0 }, '2026-07-15'), false);
  assert.equal(shouldShowLearningReminder({ reminderEnabled: true, dailyCompleted: 1 }, '2026-07-15'), false);
});
