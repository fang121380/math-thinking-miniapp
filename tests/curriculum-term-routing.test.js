const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { practiceQuestions, getQuestionBank } = require('../miniprogram/utils/question-bank');
const { buildDailySet, buildSelfPracticeSet } = require('../miniprogram/utils/adaptive');
const { createProgressStore, defaultProgress } = require('../miniprogram/utils/storage');

function memoryAdapter(initialValue) {
  let value = initialValue;
  return { get() { return value; }, set(next) { value = next; } };
}

test('daily and self-practice sets only use the learner selected term', () => {
  const scopes = [
    { schoolStage: 'primary', textbookId: 'rjb', grade: 4, learningTerm: '上册' },
    { schoolStage: 'primary', textbookId: 'rjb', grade: 4, learningTerm: '下册' },
    { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7, learningTerm: '上册' },
    { schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7, learningTerm: '下册' },
  ];

  scopes.forEach((scope, index) => {
    const profile = {
      ...scope,
      learnerId: `term-${index}`,
      difficultyMode: 'medium',
      dailyGoal: 3,
      completedIds: [],
      servedQuestionIds: [],
      weakKnowledgePoints: [],
      knowledgeState: {},
    };
    const bank = getQuestionBank(scope).practiceQuestions;
    const daily = buildDailySet(bank, profile, { date: '2026-08-11' });
    const selfPractice = buildSelfPracticeSet(bank, profile, { goal: 3 });

    assert.equal(daily.length, 3);
    assert.ok(daily.every((item) => item.term === scope.learningTerm));
    assert.equal(selfPractice.questions.length, 3);
    assert.ok(selfPractice.questions.every((item) => item.term === scope.learningTerm));
  });
});

test('changing the learning term clears only active sets and keeps learning history', () => {
  const store = createProgressStore(memoryAdapter(undefined));
  const upperQuestion = practiceQuestions.find((item) => (
    item.textbookId === 'rjb' && item.grade === 4 && item.term === '上册'
  ));
  const changed = store.changeLearningTerm({
    ...defaultProgress(),
    textbookId: 'rjb',
    grade: 4,
    learningTerm: '上册',
    stars: 9,
    completedIds: [upperQuestion.id],
    dailyQuestionIds: [upperQuestion.id],
    selfPracticeQuestionIds: [upperQuestion.id],
  }, '下册');

  assert.equal(changed.learningTerm, '下册');
  assert.equal(changed.stars, 9);
  assert.deepEqual(changed.completedIds, [upperQuestion.id]);
  assert.deepEqual(changed.dailyQuestionIds, []);
  assert.deepEqual(changed.selfPracticeQuestionIds, []);
});

test('learning settings expose an upper or lower volume selector', () => {
  const root = path.join(__dirname, '..', 'miniprogram', 'pages');
  const mineScript = fs.readFileSync(path.join(root, 'mine', 'mine.js'), 'utf8');
  const mineTemplate = fs.readFileSync(path.join(root, 'mine', 'mine.wxml'), 'utf8');
  const practiceScript = fs.readFileSync(path.join(root, 'practice', 'practice.js'), 'utf8');

  assert.match(mineScript, /changeLearningTerm/);
  assert.match(mineTemplate, /当前学期/);
  assert.match(mineTemplate, /learningTermOptions/);
  assert.match(practiceScript, /learningTerm:\s*progress\.learningTerm/);
});
