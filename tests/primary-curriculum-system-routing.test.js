const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getPrimaryCurriculumTopics,
} = require('../miniprogram/utils/textbook-curriculum');
const {
  getLearningMap,
  getTextbookOption,
} = require('../miniprogram/utils/textbook-catalog');
const { getQuestions } = require('../miniprogram/utils/question-bank');

const UPPER = '\u4e0a\u518c';

test('primary editions with multiple school systems expose a verified system at every routing boundary', () => {
  const cases = [
    {
      textbookId: 'qd',
      label: '\u9752\u5c9b\u7248\uff08\u516d\u4e09\u5236\uff09',
      schoolSystem: '6-3',
      systemHint: '\u516d\u4e09\u5236\uff08\u5c0f\u5b66\u516d\u5e74\u3001\u521d\u4e2d\u4e09\u5e74\uff09',
    },
    {
      textbookId: 'sh',
      label: '\u6caa\u6559\u7248\uff08\u4e94\u56db\u5236\uff09',
      schoolSystem: '5-4',
      systemHint: '\u4e94\u56db\u5236\uff08\u5c0f\u5b66\u4e94\u5e74\u3001\u521d\u4e2d\u56db\u5e74\uff09',
    },
  ];

  cases.forEach(({ textbookId, label, schoolSystem, systemHint }) => {
    const option = getTextbookOption(textbookId, 'primary');
    const scopes = getPrimaryCurriculumTopics(textbookId, 4);
    const map = getLearningMap(textbookId, 4, 'primary', UPPER);

    assert.equal(option.label, label);
    assert.equal(option.schoolSystem, schoolSystem);
    assert.ok(scopes.length > 0);
    assert.ok(scopes.every((scope) => scope.schoolSystem === schoolSystem));
    assert.equal(map.textbookLabel, label);
    assert.equal(map.schoolSystem, schoolSystem);
    assert.match(map.summary, new RegExp(systemHint));

    const practiceQuestions = getQuestions({ schoolStage: 'primary', textbookId, grade: 4, bank: 'practice' });
    const diagnosticQuestions = getQuestions({ schoolStage: 'primary', textbookId, grade: 4, bank: 'diagnostic' });
    assert.ok(practiceQuestions.length > 0);
    assert.ok(diagnosticQuestions.length > 0);
    assert.ok(practiceQuestions.every((question) => question.schoolSystem === schoolSystem));
    assert.ok(diagnosticQuestions.every((question) => question.schoolSystem === schoolSystem));
  });
});
