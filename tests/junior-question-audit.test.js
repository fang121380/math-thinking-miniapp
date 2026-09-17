const test = require('node:test');
const assert = require('node:assert/strict');

const { answersEquivalent } = require('../miniprogram/utils/math-answer');
const { getQuestions, auditQuestion } = require('../miniprogram/utils/question-bank');

function withoutFirst(value, token) {
  return String(value).replace(String(token), '');
}

test('every junior topic exposes an executable contract that detects field tampering', () => {
  [7, 8, 9].forEach((grade) => {
    const scope = {
      schoolStage: 'junior', textbookId: 'jr-rjb', grade, difficultyMode: 'hard', type: 'choice',
    };
    const topics = new Set(getQuestions(scope).map((item) => item.knowledgePoint));
    assert.equal(topics.size, 8);
    topics.forEach((knowledgePoint) => {
      const item = getQuestions({ ...scope, knowledgePoint })[0];
      assert.ok(item.auditRule && item.calculationExpression, item.id);
      assert.deepEqual(auditQuestion(item), [], item.id);

      const wrongAnswer = answersEquivalent('999999', item.answer, item.answerUnit, item.answerSpec)
        ? '-999999' : '999999';
      assert.ok(auditQuestion({ ...item, answer: wrongAnswer }).includes('junior_answer_mismatch'), item.id);
      assert.ok(auditQuestion({
        ...item,
        answerSpec: { ...item.answerSpec, value: wrongAnswer },
      }).includes('junior_answer_spec_invalid'), item.id);
      assert.ok(auditQuestion({
        ...item,
        answerSpec: { kind: 'unsupported', value: item.answer },
      }).includes('junior_answer_spec_invalid'), item.id);

      const requiredToken = item.auditRule.requiredTokens[0];
      assert.ok(requiredToken && item.prompt.includes(requiredToken), item.id);
      assert.ok(auditQuestion({
        ...item,
        prompt: withoutFirst(item.prompt, requiredToken),
      }).includes('junior_missing_condition'), item.id);

      const correct = item.options.find((option) => answersEquivalent(
        option, item.answer, item.answerUnit, item.answerSpec,
      ));
      const falseIndex = item.options.findIndex((option) => option !== correct);
      const options = [...item.options];
      options[falseIndex] = correct;
      assert.ok(auditQuestion({ ...item, options }).includes('junior_option_ambiguity'), item.id);
    });
  });
});

test('fraction-expression domain contract detects a forbidden substitution', () => {
  const item = getQuestions({
    schoolStage: 'junior', textbookId: 'jr-huk', grade: 8,
    difficultyMode: 'medium', type: 'fill', knowledgePoint: 'fraction_expression',
  })[0];
  const { variable, assigned, forbidden } = item.auditRule.domain;
  assert.notEqual(assigned, forbidden);
  const prompt = item.prompt.replace(`${variable}=${assigned}`, `${variable}=${forbidden}`);
  assert.ok(auditQuestion({ ...item, prompt }).includes('junior_invalid_domain'));
});

test('generated contracts never leak non-mathematical placeholder values', () => {
  [7, 8, 9].forEach((grade) => {
    const questions = getQuestions({
      schoolStage: 'junior', textbookId: 'jr-rjb', grade, difficultyMode: 'hard', type: 'problem',
    });
    questions.forEach((item) => {
      const visible = [item.prompt, item.answer, ...item.solution.steps].join(' ');
      assert.doesNotMatch(visible, /undefined|NaN|null/, item.id);
    });
  });
});
