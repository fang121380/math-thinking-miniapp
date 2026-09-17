const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { diagnosticQuestions, practiceQuestions } = require('../miniprogram/utils/question-bank');
const manifest = require('../miniprogram/utils/question-bank-manifest');
const { buildSelfPracticeSet } = require('../miniprogram/utils/adaptive');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('every enabled grade has unique explained diagnostic and practice questions', () => {
  assert.deepEqual(manifest.enabledGrades, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const prompts = [...diagnosticQuestions, ...practiceQuestions].map((item) => item.prompt);
  assert.equal(new Set(prompts).size, prompts.length);

  manifest.enabledGrades.filter((grade) => grade <= 6).forEach((grade) => {
    const diagnostics = diagnosticQuestions.filter((item) => item.grade === grade);
    const practice = practiceQuestions.filter((item) => item.grade === grade);
    assert.ok(diagnostics.length >= 32, `grade ${grade} has at least 32 diagnostics across enabled editions`);
    assert.ok(practice.length >= 48, `grade ${grade} has at least 48 practice questions`);
    assert.deepEqual([...new Set(practice.map((item) => item.type))].sort(), ['choice', 'fill', 'problem']);
    assert.deepEqual([...new Set(practice.map((item) => item.difficulty))].sort(), [1, 2, 3]);
    [...diagnostics, ...practice].forEach((item) => {
      assert.ok(item.knowledgeSummary, `${item.id} has a knowledge summary`);
      assert.ok(Array.isArray(item.mistakeSummary) && item.mistakeSummary.length, `${item.id} has mistake tips`);
    });
  });
});

test('self practice filters by grade, topic, type and difficulty without mutating daily state', () => {
  const profile = {
    learnerId: 'self-practice-learner',
    grade: 5,
    completedIds: [],
    mistakes: [],
    dailyQuestionIds: ['daily-1', 'daily-2', 'daily-3'],
  };
  const result = buildSelfPracticeSet(practiceQuestions, profile, {
    grade: 5,
    knowledgePoint: 'decimal_multiply',
    type: 'fill',
    difficultyMode: 'easy',
    goal: 3,
  });
  assert.equal(result.mode, 'new');
  assert.equal(result.questions.length, 3);
  assert.ok(result.questions.every((item) => (
    item.grade === 5
    && item.knowledgePoint === 'decimal_multiply'
    && item.type === 'fill'
    && item.difficulty === 1
  )));
  assert.deepEqual(profile.dailyQuestionIds, ['daily-1', 'daily-2', 'daily-3']);
});

test('self practice switches to review after its filtered topic is complete', () => {
  const candidates = practiceQuestions.filter((item) => (
    item.grade === 6 && item.knowledgePoint === 'fraction_divide' && item.type === 'problem'
  ));
  const result = buildSelfPracticeSet(practiceQuestions, {
    learnerId: 'review-learner',
    grade: 6,
    completedIds: candidates.map((item) => item.id),
    mistakes: [],
  }, {
    grade: 6,
    knowledgePoint: 'fraction_divide',
    type: 'problem',
    difficultyMode: 'medium',
    goal: 3,
  });
  assert.equal(result.mode, 'review');
  assert.equal(result.questions.length, 3);
  assert.ok(result.questions.every((item) => item.difficulty === 2));
});

test('self practice page and knowledge feedback are declared in the mini program', () => {
  const appConfig = JSON.parse(read('miniprogram/app.json'));
  assert.ok(appConfig.pages.includes('pages/practice/practice'));
  assert.match(read('miniprogram/pages/question/question.wxml'), /知识点总结/);
  assert.match(read('miniprogram/pages/question/question.wxml'), /易错提醒/);
  assert.match(read('miniprogram/pages/analysis/analysis.wxml'), /知识点总结/);
  assert.match(read('miniprogram/pages/analysis/analysis.wxml'), /易错提醒/);
});
