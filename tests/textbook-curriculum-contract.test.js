const test = require('node:test');
const assert = require('node:assert/strict');

const {
  JUNIOR_EDITION_META,
  getCurriculumScope,
  getJuniorCurriculumTopics,
} = require('../miniprogram/utils/textbook-curriculum');
const { getJuniorTopics } = require('../miniprogram/utils/junior-high-curriculum');
const { getLearningMap, getTextbookOption } = require('../miniprogram/utils/textbook-catalog');
const { getQuestionBank } = require('../miniprogram/utils/question-bank');

const UPPER = '\u4e0a\u518c';
const LOWER = '\u4e0b\u518c';

function topicKeysForTerm(topics, term) {
  return topics.filter((topic) => topic.term === term).map((topic) => topic.topicKey || topic.key);
}

test('RJB grade seven routes its upper and lower curriculum scopes without topic leakage', () => {
  const expectedUpper = ['rational_number', 'algebraic_expression', 'linear_equation', 'angle_line'];
  const expectedLower = ['triangle_intro', 'data_statistics', 'inequality_intro', 'coordinate_plane'];
  const scopes = getJuniorCurriculumTopics('jr-rjb', 7);

  assert.deepEqual(topicKeysForTerm(scopes, UPPER), expectedUpper);
  assert.deepEqual(topicKeysForTerm(scopes, LOWER), expectedLower);
  assert.equal(new Set(scopes.map((scope) => scope.topicKey)).size, scopes.length);
  assert.match(scopes.find((scope) => scope.topicKey === 'angle_line').topicLabel, /\u51e0\u4f55.*\u89d2/);
  assert.equal(getCurriculumScope('junior', 'jr-rjb', 7, 'angle_line').term, UPPER);

  const learningTopics = getJuniorTopics('jr-rjb', 7);
  assert.deepEqual(topicKeysForTerm(learningTopics, UPPER), expectedUpper);
  assert.deepEqual(topicKeysForTerm(learningTopics, LOWER), expectedLower);

  const questions = getQuestionBank({ schoolStage: 'junior', textbookId: 'jr-rjb', grade: 7 }).practiceQuestions;
  const upperQuestionKeys = [...new Set(questions.filter((item) => item.term === UPPER).map((item) => item.knowledgePoint))];
  const lowerQuestionKeys = [...new Set(questions.filter((item) => item.term === LOWER).map((item) => item.knowledgePoint))];
  assert.deepEqual(upperQuestionKeys, expectedUpper);
  assert.deepEqual(lowerQuestionKeys, expectedLower);
  assert.equal(new Set(questions.map((item) => item.id)).size, questions.length);
});

test('Lu textbook is explicitly labelled as the five-four system in metadata and catalogue output', () => {
  const label = '\u9c81\u6559\u7248\uff08\u4e94\u56db\u5236\uff09';
  const hint = '\u4e94\u56db\u5236\uff08\u5c0f\u5b66\u4e94\u5e74\u3001\u521d\u4e2d\u56db\u5e74\uff09';
  const option = getTextbookOption('jr-luj', 'junior');
  const scopes = getJuniorCurriculumTopics('jr-luj', 7);
  const map = getLearningMap('jr-luj', 7, 'junior', UPPER);

  assert.equal(JUNIOR_EDITION_META['jr-luj'].schoolSystem, '5-4');
  assert.equal(option.label, label);
  assert.equal(option.schoolSystem, '5-4');
  assert.match(option.focus, /\u4e94\u56db\u5236/);
  assert.ok(scopes.every((scope) => scope.schoolSystem === '5-4'));
  assert.equal(map.textbookLabel, label);
  assert.equal(map.schoolSystem, '5-4');
  assert.match(map.unitLabel, /\u4e94\u56db\u5236/);
  assert.match(map.summary, new RegExp(hint));
});

test('LuJ five-four curriculum uses source-aligned supported topics and scope-derived diagnostics', () => {
  const expected = {
    7: {
      upper: ['triangle_intro', 'congruent_triangle', 'axis_symmetry', 'pythagorean', 'real_number', 'coordinate_plane', 'linear_function'],
      lower: ['probability', 'geometry_proof', 'inequality_intro'],
    },
    8: {
      upper: ['fraction_expression', 'data_analysis'],
      lower: ['real_number', 'quadratic_equation', 'similar_triangle'],
    },
    9: {
      upper: ['right_triangle', 'quadratic_function', 'quadratic_equation'],
      lower: ['circle', 'probability', 'data_inference'],
    },
  };

  Object.entries(expected).forEach(([gradeText, terms]) => {
    const grade = Number(gradeText);
    const curriculum = getJuniorCurriculumTopics('jr-luj', grade);
    const learningTopics = getJuniorTopics('jr-luj', grade);
    const scope = { schoolStage: 'junior', textbookId: 'jr-luj', grade };
    const bank = getQuestionBank(scope);
    const expectedKeys = [...terms.upper, ...terms.lower];

    assert.deepEqual(topicKeysForTerm(curriculum, UPPER), terms.upper, `LuJ g${grade} upper`);
    assert.deepEqual(topicKeysForTerm(curriculum, LOWER), terms.lower, `LuJ g${grade} lower`);
    assert.deepEqual(learningTopics.map((topic) => topic.key), expectedKeys, `LuJ g${grade} display keys`);
    assert.deepEqual(
      learningTopics.map((topic) => topic.label),
      curriculum.map((topic) => topic.topicLabel),
      `LuJ g${grade} display labels must use curriculum labels rather than positional generic labels`,
    );
    assert.deepEqual(
      [...new Set(bank.practiceQuestions.map((question) => question.knowledgePoint))],
      expectedKeys,
      `LuJ g${grade} practice topics`,
    );
    assert.ok(
      bank.diagnosticQuestions.every((question) => expectedKeys.includes(question.knowledgePoint)),
      `LuJ g${grade} diagnostics must remain inside the declared curriculum`,
    );
  });
});
