const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDailySet, buildSelfPracticeSet } = require('../miniprogram/utils/adaptive');

function question(id, type, prompt) {
  return {
    id,
    schoolStage: 'primary',
    textbookId: 'rjb',
    grade: 4,
    term: '上册',
    type,
    difficulty: 2,
    knowledgePoint: `${type}_topic`,
    prompt,
    answer: '12',
    answerUnit: '',
  };
}

function duplicateContentBank() {
  return ['choice', 'fill', 'problem'].flatMap((type) => [
    question(`${type}-already-served`, type, `计算：${type} 的 6 + 6 = （ ）。`),
    question(`${type}-fresh`, type, `计算：${type} 的 7 + 6 = （ ）。`),
  ]);
}

const profile = {
  learnerId: 'content-history-learner',
  schoolStage: 'primary',
  textbookId: 'rjb',
  grade: 4,
  learningTerm: '上册',
  completedIds: [],
  servedQuestionIds: [],
  // A prior session can have a different ID but the same question content.
  servedQuestionSignatures: [
    '计算choice的6+6=（）。|12|',
    '计算fill的6+6=（）。|12|',
    '计算problem的6+6=（）。|12|',
  ],
};

test('daily selection rejects previously served equivalent content when fresh alternatives exist', () => {
  const selected = buildDailySet(duplicateContentBank(), profile, {
    date: '2026-08-14', difficultyMode: 'medium', goal: 3,
  });

  assert.deepEqual(selected.map((item) => item.id).sort(), [
    'choice-fresh', 'fill-fresh', 'problem-fresh',
  ]);
});

test('self practice rejects previously served equivalent content when fresh alternatives exist', () => {
  const selected = buildSelfPracticeSet(duplicateContentBank(), profile, {
    difficultyMode: 'medium', goal: 3, attemptNonce: 7,
  });

  assert.deepEqual(selected.questions.map((item) => item.id).sort(), [
    'choice-fresh', 'fill-fresh', 'problem-fresh',
  ]);
  assert.equal(selected.mode, 'new');
});
