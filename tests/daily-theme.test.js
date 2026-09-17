const test = require('node:test');
const assert = require('node:assert/strict');

const { DAILY_THEMES, getDailyTheme } = require('../miniprogram/utils/daily-theme');
const { buildDailySet } = require('../miniprogram/utils/adaptive');

test('daily themes rotate deterministically through seven child-facing themes', () => {
  const dates = [
    '2026-08-03',
    '2026-08-04',
    '2026-08-05',
    '2026-08-06',
    '2026-08-07',
    '2026-08-08',
    '2026-08-09',
  ];
  const themes = dates.map((date) => getDailyTheme(date));

  assert.equal(DAILY_THEMES.length, 7);
  assert.equal(new Set(themes.map((item) => item.id)).size, 7);
  assert.deepEqual(getDailyTheme('2026-08-05'), getDailyTheme('2026-08-05'));
  assert.equal(getDailyTheme('not-a-date').id, DAILY_THEMES[0].id);
  themes.forEach((theme) => {
    assert.ok(theme.title);
    assert.ok(theme.copy);
    assert.ok(theme.ability);
  });
});

test('daily selection uses an eligible theme ability without losing type coverage', () => {
  const bank = [
    { id: 'theme-choice', type: 'choice', ability: 'geometry', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'shape' },
    { id: 'normal-choice', type: 'choice', ability: 'calculation', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'number' },
    { id: 'normal-fill', type: 'fill', ability: 'calculation', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'number' },
    { id: 'normal-problem', type: 'problem', ability: 'problem', difficulty: 2, grade: 4, textbookId: 'rjb', term: '上册', knowledgePoint: 'life' },
  ];
  const profile = {
    learnerId: 'theme-learner',
    grade: 4,
    textbookId: 'rjb',
    difficultyMode: 'medium',
    dailyGoal: 3,
    completedIds: [],
    servedQuestionIds: [],
    weakKnowledgePoints: [],
    knowledgeState: {},
  };

  const selected = buildDailySet(bank, profile, {
    date: '2026-08-05',
    goal: 3,
    themeAbility: 'geometry',
  });

  assert.equal(selected.length, 3);
  assert.ok(selected.some((item) => item.ability === 'geometry'));
  assert.deepEqual(selected.map((item) => item.type).sort(), ['choice', 'fill', 'problem']);
});
