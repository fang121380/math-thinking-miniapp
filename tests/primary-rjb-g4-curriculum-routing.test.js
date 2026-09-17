const test = require('node:test');
const assert = require('node:assert/strict');

const { getCurriculumScope, getPrimaryCurriculumTopics } = require('../miniprogram/utils/textbook-curriculum');
const { getQuestions, auditQuestionBankQuality } = require('../miniprogram/utils/question-bank');

const UPPER = '\u4e0a\u518c';
const LOWER = '\u4e0b\u518c';

test('RJB grade four observation questions follow the lower-volume observation unit', () => {
  const scope = getCurriculumScope('primary', 'rjb', 4, 'view_from_direction');

  assert.equal(scope.term, LOWER);
  assert.equal(scope.chapterLabel, '\u7b2c2\u5355\u5143 \u89c2\u5bdf\u7269\u4f53\uff08\u4e8c\uff09');

  const upper = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4, term: UPPER, bank: 'practice',
  });
  const lower = getQuestions({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4, term: LOWER, bank: 'practice',
  });

  assert.ok(!upper.some((question) => question.knowledgePoint === 'view_from_direction'));
  assert.ok(lower.some((question) => question.knowledgePoint === 'view_from_direction'));
});

test('primary source alignment requires a topic-specific edition reference', () => {
  for (const key of ['view_from_direction', 'average', 'two_step_division_problem', 'decimal_money_problem']) {
    const scope = getCurriculumScope('primary', 'rjb', 4, key);
    assert.equal(scope.curriculumAlignment, 'source-aligned', key);
    assert.equal(scope.curriculumReference, 'PEP-2011-curriculum', key);
    assert.match(scope.curriculumSourceUrl, /^https:\/\/www\.pep\.com\.cn\//, key);
    assert.equal(scope.term, LOWER, key);
  }
  for (const [edition, grade, key] of [
    ['rjb', 4, 'number_pattern'],
    ['rjb', 4, 'multiply_estimation'],
    ['bsd', 4, 'average'],
    ['rjb', 1, 'clock_reading'],
  ]) {
    const scope = getCurriculumScope('primary', edition, grade, key);
    assert.equal(scope.curriculumAlignment, 'topic-aligned');
    assert.equal(scope.curriculumSourceUrl, undefined);
  }
});

test('RJB grade four chapter identities do not merge unrelated upper and lower units', () => {
  const identities = new Map();
  for (const scope of getPrimaryCurriculumTopics('rjb', 4)) {
    const identity = `${scope.term}:${scope.chapterLabel}`;
    if (identities.has(scope.chapterId)) {
      assert.equal(identities.get(scope.chapterId), identity, scope.chapterId);
    }
    identities.set(scope.chapterId, identity);
  }
});

test('published RJB grade four questions carry their curriculum reference and verified lower-volume labels', () => {
  const chapters = {
    average: '平均数与条形统计图',
    two_step_division_problem: '四则运算',
    decimal_money_problem: '小数的加法和减法',
  };
  for (const bank of ['diagnostic', 'practice']) {
    const questions = getQuestions({ schoolStage: 'primary', textbookId: 'rjb', grade: 4, bank });
    for (const [topic, label] of Object.entries(chapters)) {
      const items = questions.filter((item) => item.knowledgePoint === topic);
      assert.ok(items.length > 0, `${bank}:${topic}`);
      for (const item of items) {
        assert.equal(item.term, LOWER, item.id);
        assert.equal(item.unit, label, item.id);
        assert.equal(item.curriculumAlignment, 'source-aligned', item.id);
        assert.equal(item.curriculumReference, 'PEP-2011-curriculum', item.id);
      }
    }
  }
});

test('content audit rejects unsupported or altered primary curriculum source claims', () => {
  const questions = getQuestions({ schoolStage: 'primary', textbookId: 'rjb', grade: 4, bank: 'practice' });
  const checked = questions.find((item) => item.knowledgePoint === 'average');
  const unchecked = questions.find((item) => item.knowledgePoint === 'number_pattern');
  assert.deepEqual(auditQuestionBankQuality([checked, unchecked]), []);
  for (const item of [
    { ...checked, curriculumReference: 'PEP-2024' },
    { ...checked, curriculumSourceUrl: undefined },
    { ...unchecked, curriculumAlignment: 'source-aligned' },
  ]) {
    assert.ok(auditQuestionBankQuality([item]).some((issue) => issue.code === 'curriculum_metadata_mismatch'), item.id);
  }
});
