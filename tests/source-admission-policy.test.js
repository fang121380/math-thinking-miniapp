const test = require('node:test');
const assert = require('node:assert/strict');

const {
  auditQuestionSourceAdmission,
  SOURCE_POLICY,
} = require('../scripts/question-source-policy');
const { collectPublishedQuestions, auditEveryPublishedQuestion } = require('../scripts/audit-question-bank');

function originalQuestion(overrides = {}) {
  return {
    id: 'source-policy-original',
    sourceType: 'project-original',
    textbookId: 'rjb',
    grade: 4,
    editionUnitKey: 'rjb-g4-u1',
    reviewStatus: 'auto-checked',
    reviewedAt: '2026-08-14',
    ...overrides,
  };
}

test('project-original questions are admitted only when they make no external-source claim', () => {
  assert.deepEqual(auditQuestionSourceAdmission(originalQuestion()), []);
  assert.ok(auditQuestionSourceAdmission(originalQuestion({
    sourceUrl: 'https://example.org/paper.pdf',
  })).includes('project_original_external_claim'));
});

test('external questions require complete verifiable rights and curriculum evidence', () => {
  const external = originalQuestion({
    sourceType: 'licensed-external',
    sourceName: '示例教育资源库',
    sourceUrl: 'https://example.org/questions/2026-001',
    sourceId: '2026-001',
    sourceLicense: 'CC-BY-4.0',
    sourceRightsEvidence: 'https://example.org/licenses/cc-by-4.0',
    sourceAttribution: '示例教育资源库，CC BY 4.0，已按要求署名。',
    sourceTextbookMapping: {
      textbookId: 'rjb',
      grade: 4,
      editionUnitKey: 'rjb-g4-u1',
    },
  });
  assert.deepEqual(auditQuestionSourceAdmission(external), []);
  assert.ok(auditQuestionSourceAdmission({ ...external, sourceLicense: 'CC-BY-NC-4.0' })
    .includes('external_source_noncommercial_license'));
  assert.ok(auditQuestionSourceAdmission({ ...external, sourceType: 'web-scrape' })
    .includes('external_source_type_rejected'));
  assert.ok(auditQuestionSourceAdmission({ ...external, sourceRightsEvidence: '' })
    .includes('external_source_rights_evidence_missing'));
});

test('complete published catalog is explicitly project-original and passes source admission', () => {
  const questions = collectPublishedQuestions();
  assert.equal(questions.length, 21297);
  assert.ok(questions.every((question) => question.sourceType === 'project-original'));
  assert.deepEqual(questions.flatMap(auditQuestionSourceAdmission), []);

  const report = auditEveryPublishedQuestion(questions);
  assert.equal(report.errors.length, 0);
});

test('source policy declares the only upload-eligible external licenses', () => {
  assert.deepEqual(SOURCE_POLICY.allowedExternalSourceTypes, ['licensed-external']);
  assert.ok(SOURCE_POLICY.allowedLicenses.includes('CC-BY-4.0'));
  assert.ok(SOURCE_POLICY.allowedLicenses.includes('MIT'));
  assert.equal(SOURCE_POLICY.allowedLicenses.some((license) => /-NC-/.test(license)), false);
});
