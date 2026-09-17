const test = require('node:test');
const assert = require('node:assert/strict');

const { createTalReviewCandidate, parseTalRecords } = require('../scripts/import-tal-scq5k');
const { auditQuestionSourceAdmission } = require('../scripts/question-source-policy');

test('TAL import preserves the original problem, options, solution, and MIT provenance for review', () => {
  const candidate = createTalReviewCandidate({
    queId: 'tal-source-001',
    problem: '一个数除以 3 的余数是 1，下面哪个数可能是这个数？',
    answer_option_list: [
      [{ aoVal: 'A', content: '10' }],
      [{ aoVal: 'B', content: '12' }],
      [{ aoVal: 'C', content: '15' }],
      [{ aoVal: 'D', content: '18' }],
    ],
    answer_value: 'A',
    answer_analysis: ['10 ÷ 3 的余数是 1，因此选 A。'],
    knowledge_point_routes: ['拓展思维->数论->余数'],
    difficulty: '2',
  });

  assert.equal(candidate.sourceType, 'licensed-external');
  assert.equal(candidate.sourceLicense, 'MIT');
  assert.equal(candidate.sourceId, 'tal-source-001');
  assert.equal(candidate.prompt, '一个数除以 3 的余数是 1，下面哪个数可能是这个数？');
  assert.deepEqual(candidate.options, ['10', '12', '15', '18']);
  assert.equal(candidate.answer, 'A');
  assert.equal(candidate.solution, '10 ÷ 3 的余数是 1，因此选 A。');
  assert.equal(candidate.reviewStatus, 'pending-manual-mapping');
  assert.ok(auditQuestionSourceAdmission(candidate).includes('external_source_textbook_mapping_missing'));
});

test('TAL import repairs a raw line break inside a source analysis string without splitting its record', () => {
  const raw = '{"queId":"tal-multiline","problem":"题干","answer_option_list":[],"answer_value":"A","answer_analysis":["第一步\n第二步"]}';
  const result = parseTalRecords(raw);

  assert.equal(result.records.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.deepEqual(result.records[0].answer_analysis, ['第一步\n第二步']);
});
