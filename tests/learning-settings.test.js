const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_LEARNING_SETTINGS,
  getGradeOptions,
  normalizeLearningSettings,
  schoolStageOptions,
} = require('../miniprogram/utils/learning-settings');

test('junior settings accept grades seven through nine only', () => {
  assert.deepEqual(getGradeOptions('junior').map((item) => item.value), [7, 8, 9]);
  assert.deepEqual(normalizeLearningSettings({ schoolStage: 'junior', grade: 8 }), {
    ...DEFAULT_LEARNING_SETTINGS,
    textbookId: 'jr-rjb',
    schoolStage: 'junior',
    grade: 8,
  });
});

test('textbook settings are constrained to the normalized school stage', () => {
  assert.deepEqual(normalizeLearningSettings({
    schoolStage: 'junior',
    grade: 8,
    textbookId: 'jr-bsd',
  }), {
    ...DEFAULT_LEARNING_SETTINGS,
    textbookId: 'jr-bsd',
    schoolStage: 'junior',
    grade: 8,
  });
  assert.equal(normalizeLearningSettings({
    schoolStage: 'junior',
    grade: 8,
    textbookId: 'unknown',
  }).textbookId, 'jr-rjb');
  assert.equal(normalizeLearningSettings({
    schoolStage: 'primary',
    grade: 4,
    textbookId: 'jr-bsd',
  }).textbookId, 'rjb');
});

test('legacy settings without a stage always normalize to primary', () => {
  assert.equal(normalizeLearningSettings({ grade: 5 }).schoolStage, 'primary');
  assert.deepEqual(normalizeLearningSettings({ grade: 8 }), {
    ...DEFAULT_LEARNING_SETTINGS,
    schoolStage: 'primary',
    grade: 4,
  });
  assert.deepEqual(schoolStageOptions.map((item) => item.value), ['primary', 'junior']);
});

test('an invalid grade falls back within the selected stage', () => {
  assert.deepEqual(normalizeLearningSettings({ schoolStage: 'junior', grade: 4 }), {
    ...DEFAULT_LEARNING_SETTINGS,
    textbookId: 'jr-rjb',
    schoolStage: 'junior',
    grade: 7,
  });
});
