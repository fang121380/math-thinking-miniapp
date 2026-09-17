const test = require('node:test');
const assert = require('node:assert/strict');
const { getWeeklyMission, getMilestoneBadges } = require('../miniprogram/utils/learning-milestones');

test('weekly mission counts unique completed days in the current week only', () => {
  const mission = getWeeklyMission({
    completionDates: ['2026-07-26', '2026-07-27', '2026-07-29', '2026-07-29', '2026-07-31', '2026-08-02'],
  }, '2026-07-31');

  assert.deepEqual(mission, {
    weekStart: '2026-07-27',
    targetDays: 3,
    completedDays: 3,
    complete: true,
    nextCopy: '本周小目标完成了，明天也可以回来试试。',
  });
});

test('weekly mission resets on Monday and never counts a future completion date', () => {
  const mission = getWeeklyMission({
    completionDates: ['2026-07-31', '2026-08-03', '2026-08-05'],
  }, '2026-08-03');

  assert.equal(mission.weekStart, '2026-08-03');
  assert.equal(mission.completedDays, 1);
  assert.equal(mission.complete, false);
  assert.equal(mission.nextCopy, '再完成 2 天，就能完成本周小目标。');
});

test('milestone badges are deterministic and tolerate incomplete progress safely', () => {
  const empty = getMilestoneBadges({});
  assert.deepEqual(empty.map((item) => [item.id, item.earned]), [
    ['first_steps', false],
    ['steady_practice', false],
    ['review_master', false],
    ['star_collector', false],
  ]);

  const earned = getMilestoneBadges({
    completedIds: ['a', 'b', 'c'],
    completionDates: ['2026-07-28', '2026-07-29', '2026-07-30'],
    knowledgeState: { division: { reviewStage: 2 } },
    stars: 3,
  });
  assert.equal(earned.every((item) => item.earned), true);
  assert.deepEqual(earned.map((item) => item.title), ['开始思考', '稳定练习', '复习达人', '思路收集者']);
});
