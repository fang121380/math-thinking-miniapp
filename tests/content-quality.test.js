const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticQuestions, practiceQuestions, buildReviewSamples } = require('../miniprogram/utils/question-bank');
const { decideContentUpdate } = require('../miniprogram/utils/content-update');

test('every published question records original-pattern provenance and review status', () => {
  [...diagnosticQuestions, ...practiceQuestions].forEach((question) => {
    assert.match(question.sourceRegion, /^(nationwide|shandong|jining)$/);
    assert.match(question.sourceYear, /^20(2[2-6])$/);
    assert.match(question.examPattern, /^(reverse_reasoning|condition_filter|data_reading|unit_check|open_strategy|estimate_check|combination_strategy|calculation_model)$/);
    assert.equal(question.reviewStatus, 'auto-checked');
    assert.match(question.reviewedAt, /^2026-07-31$/);
  });
});

test('review sampling is deterministic and covers every textbook-grade group', () => {
  const samples = buildReviewSamples(practiceQuestions, { perGroup: 20 });
  assert.equal(samples.length, 8 * 6 * 20);
  assert.deepEqual(samples, buildReviewSamples(practiceQuestions, { perGroup: 20 }));
  samples.forEach((question) => {
    assert.ok(question.prompt);
    assert.ok(question.answer);
    assert.ok(question.solution.steps.length);
    assert.ok(question.sourceRegion);
  });
});

test('content update protocol uses only a newer compatible manifest and otherwise keeps the bundled bank', () => {
  const bundled = { version: '2026.07.22.1', minimumAppVersion: '1.0.0', contentUrl: '' };
  assert.deepEqual(decideContentUpdate(bundled, { version: '2026.07.22.2', minimumAppVersion: '1.0.0', contentUrl: 'https://example.invalid/bank.json' }, '1.0.0'), {
    action: 'available', version: '2026.07.22.2', url: 'https://example.invalid/bank.json',
  });
  assert.equal(decideContentUpdate(bundled, { version: '2026.07.22.1', minimumAppVersion: '1.0.0', contentUrl: 'https://example.invalid/bank.json' }, '1.0.0').action, 'bundled');
  assert.equal(decideContentUpdate(bundled, { version: '2026.07.22.3', minimumAppVersion: '9.0.0', contentUrl: 'https://example.invalid/bank.json' }, '1.0.0').action, 'bundled');
});

function assertSolvableReverseEquation(item) {
  assert.match(item.prompt, /□/, `${item.id} needs a missing-value prompt`);
  const match = String(item.calculationExpression || '').match(/^□\s*([+\-×÷])\s*(-?\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)$/);
  assert.ok(match, `${item.id} needs a single-blank equation`);

  const blank = Number(item.answer);
  const known = Number(match[2]);
  const expected = Number(match[3]);
  assert.ok(Number.isFinite(blank), `${item.id} needs a numeric blank answer`);
  const actual = match[1] === '+' ? blank + known
    : match[1] === '-' ? blank - known
      : match[1] === '×' ? blank * known
        : blank / known;
  assert.ok(Math.abs(actual - expected) < 1e-9, `${item.id} has an incorrect reverse answer`);

  const explanation = [
    ...(item.solution && Array.isArray(item.solution.steps) ? item.solution.steps : []),
    item.solution && item.solution.summary,
  ].filter(Boolean).join('\n');
  assert.match(explanation, /□/, `${item.id} needs a blank-aware explanation`);
  assert.ok(explanation.includes(String(item.answer)), `${item.id} needs an answer-aware explanation`);
}

test('published reverse-reasoning questions use a solvable blank equation', () => {
  const reverseQuestions = practiceQuestions.filter((item) => item.examPattern === 'reverse_reasoning');
  const estimateQuestions = practiceQuestions.filter((item) => item.examPattern === 'estimate_check');
  assert.ok(reverseQuestions.length > 500);
  assert.ok(estimateQuestions.length > 500);
  reverseQuestions.forEach(assertSolvableReverseEquation);
  assert.ok(estimateQuestions.every((item) => /估|接近|大约|范围/.test(item.prompt)), 'estimate questions need an estimate cue');
});

test('every edition-grade-difficulty-type pool keeps age-appropriate genuine thinking forms', () => {
  const groups = new Map();
  practiceQuestions.forEach((item) => {
    const key = `${item.textbookId}|${item.grade}|${item.difficulty}|${item.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  groups.forEach((items, key) => {
    const grade = Number(key.split('|')[1]);
    const patterns = new Set(items.map((item) => item.examPattern));
    const minimumPatterns = grade === 1 ? 3 : 4;
    assert.ok(patterns.size >= minimumPatterns, `${key} needs at least ${minimumPatterns} thinking forms`);

    if (grade === 1) {
      assert.deepEqual(patterns, new Set(['calculation_model', 'unit_check', 'condition_filter']), `${key} should stay within grade-one forms`);
      assert.ok(items.some((item) => item.examPattern === 'calculation_model' && item.calculationExpression), `${key} needs a real calculation form`);
      assert.ok(items.some((item) => item.examPattern === 'unit_check' && /元|时|厘米/.test(item.prompt)), `${key} needs a real unit form`);
      assert.ok(items.some((item) => item.examPattern === 'condition_filter' && !item.calculationExpression), `${key} needs a real observation form`);
    }
  });
});
