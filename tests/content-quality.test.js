const test = require('node:test');
const assert = require('node:assert/strict');

const { diagnosticQuestions, practiceQuestions, buildReviewSamples } = require('../miniprogram/utils/question-bank');
const {
  decideContentUpdate,
  createContentPack,
  validateContentPack,
  selectContentPack,
  createContentPackStore,
} = require('../miniprogram/utils/content-update');
const { renderGrade4ThinkingReviewReport } = require('../docs/tools/generate-grade4-thinking-review-report');

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

test('grade-four thinking review queue lists every representative item as pending human review', () => {
  const report = renderGrade4ThinkingReviewReport();
  assert.equal((report.match(/^- \[ \] 待人工复核$/gm) || []).length, 36);
  assert.match(report, /待复核：36 道；已确认：0 道/);
  assert.match(report, /不代表教师或教研人员已经审核/);
});

test('grade-three and grade-five concept practice gives concrete hints and explanations', () => {
  const ids = [
    'p-g3-fraction_compare-5', 'p-g3-fraction_compare-6',
    'p-g3-mass_convert-5', 'p-g3-mass_convert-6',
    'p-g5-factor_multiple-5', 'p-g5-factor_multiple-6',
    'p-g5-fraction_add-5', 'p-g5-fraction_add-6',
    'p-g5-unit_conversion_g5-5', 'p-g5-unit_conversion_g5-6',
  ];
  const byId = new Map(practiceQuestions.map((question) => [question.id, question]));
  const rows = ids.map((id) => byId.get(id));
  rows.forEach((question) => {
    assert.ok(question, 'representative concept question should exist');
    assert.doesNotMatch(question.hint, /想一想“.*”的定义/, question.id);
    assert.ok(question.solution.steps.length >= 2, question.id);
    assert.doesNotMatch(question.solution.steps.join(' '), /根据 .* 的规则判断/, question.id);
  });
});

test('lower-primary concept practice explains an observable action instead of a definition shell', () => {
  const ids = [
    'p-g1-clock_reading-5', 'p-g1-clock_reading-6',
    'p-g1-shape_recognition-5', 'p-g1-shape_recognition-6',
    'p-g1-length_compare-6', 'p-g2-number_within_10000-5',
    'p-g2-number_within_10000-6', 'p-g2-length_unit-5',
    'p-g2-length_unit-6', 'p-g2-angle_right-5', 'p-g2-angle_right-6',
  ];
  const byId = new Map(practiceQuestions.map((question) => [question.id, question]));
  ids.forEach((id) => {
    const question = byId.get(id);
    assert.ok(question, id);
    assert.doesNotMatch(question.hint, /想一想“.*”的定义/, id);
    assert.ok(question.solution.steps.length >= 2, id);
    assert.doesNotMatch(question.solution.steps.join(' '), /根据 .* 的规则判断/, id);
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

test('content packs require a newer compatible manifest, unique prompts, and an intact checksum', () => {
  const bundled = { version: '2026.09.17.1', minimumAppVersion: '1.0.0' };
  const manifest = { version: '2026.09.18.1', minimumAppVersion: '1.0.0' };
  const pack = createContentPack(manifest, [
    { id: 'remote-1', prompt: '计算 2+2。' },
    { id: 'remote-2', prompt: '计算 3+3。' },
  ]);

  assert.equal(validateContentPack(pack, bundled, '1.0.0').ok, true);
  assert.equal(validateContentPack({ ...pack, questions: [{ id: 'same', prompt: '甲' }, { id: 'same', prompt: '乙' }] }, bundled, '1.0.0').error, 'checksum_mismatch');
  const duplicatePrompt = createContentPack(manifest, [{ id: 'a', prompt: '相同题面' }, { id: 'b', prompt: '相同题面' }]);
  assert.equal(validateContentPack(duplicatePrompt, bundled, '1.0.0').error, 'invalid_questions');
  const tampered = { ...pack, checksum: pack.checksum, questions: pack.questions.map((question) => ({ ...question, prompt: `${question.prompt}改` })) };
  assert.equal(validateContentPack(tampered, bundled, '1.0.0').error, 'checksum_mismatch');
  assert.equal(validateContentPack(pack, bundled, '0.9.0').error, 'incompatible_app');
});

test('content selection prefers a valid candidate and falls back through cache to bundled content', () => {
  const bundled = { version: '2026.09.17.1', minimumAppVersion: '1.0.0' };
  const cached = createContentPack({ version: '2026.09.18.1', minimumAppVersion: '1.0.0' }, [{ id: 'cached', prompt: '缓存题' }]);
  const candidate = createContentPack({ version: '2026.09.19.1', minimumAppVersion: '1.0.0' }, [{ id: 'candidate', prompt: '候选题' }]);
  assert.equal(selectContentPack({ bundledManifest: bundled, candidate, cached }).source, 'candidate');
  const invalidCandidate = { ...candidate, checksum: '00000000' };
  const fallback = selectContentPack({ bundledManifest: bundled, candidate: invalidCandidate, cached });
  assert.equal(fallback.source, 'cached');
  assert.equal(selectContentPack({ bundledManifest: bundled, candidate: invalidCandidate }).source, 'bundled');
});

test('content pack installation writes active and previous versions atomically and rejects invalid packs', () => {
  const bundled = { version: '2026.09.17.1', minimumAppVersion: '1.0.0' };
  let stored;
  const adapter = {
    get() { return stored; },
    set(key, value) { assert.equal(key, 'mathThinkingContentPackV1'); stored = value; },
  };
  const store = createContentPackStore({ adapter, bundledManifest: bundled });
  const first = createContentPack({ version: '2026.09.18.1', minimumAppVersion: '1.0.0' }, [{ id: 'one', prompt: '一' }]);
  const second = createContentPack({ version: '2026.09.19.1', minimumAppVersion: '1.0.0' }, [{ id: 'two', prompt: '二' }]);

  assert.equal(store.install(first).installed, true);
  assert.equal(store.install(second).installed, true);
  assert.equal(stored.active.version, '2026.09.19.1');
  assert.equal(stored.previous.version, '2026.09.18.1');
  assert.equal(store.load().source, 'candidate');
  const before = JSON.stringify(stored);
  assert.equal(store.install({ ...second, checksum: 'bad' }).installed, false);
  assert.equal(JSON.stringify(stored), before);
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
