const SOURCE_POLICY = Object.freeze({
  allowedExternalSourceTypes: ['licensed-external'],
  allowedLicenses: [
    'CC0-1.0',
    'CC-BY-4.0',
    'CC-BY-SA-4.0',
    'MIT',
    'Public-Domain',
    'Publisher-Written-Permission',
    'Purchased-License',
  ],
});

const EXTERNAL_EVIDENCE_FIELDS = [
  'sourceName',
  'sourceUrl',
  'sourceId',
  'sourceLicense',
  'sourceRightsEvidence',
  'sourceAttribution',
  'sourceTextbookMapping',
];

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value) {
  if (!hasText(value)) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function auditReviewMetadata(question, issues) {
  if (!hasText(question.reviewStatus)) issues.push('source_review_status_missing');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(question.reviewedAt || ''))) {
    issues.push('source_reviewed_at_invalid');
  }
}

function auditExternalMapping(question, issues) {
  const mapping = question.sourceTextbookMapping;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    issues.push('external_source_textbook_mapping_missing');
    return;
  }
  if (mapping.textbookId !== question.textbookId
    || Number(mapping.grade) !== Number(question.grade)
    || mapping.editionUnitKey !== question.editionUnitKey) {
    issues.push('external_source_textbook_mapping_mismatch');
  }
}

function auditQuestionSourceAdmission(question) {
  const issues = [];
  if (!question || typeof question !== 'object') return ['source_question_invalid'];

  auditReviewMetadata(question, issues);
  const sourceType = String(question.sourceType || '').trim();
  if (!sourceType) return [...issues, 'source_type_missing'];

  if (sourceType === 'project-original') {
    if (EXTERNAL_EVIDENCE_FIELDS.some((field) => question[field] !== undefined && question[field] !== null && question[field] !== '')) {
      issues.push('project_original_external_claim');
    }
    return issues;
  }

  if (!SOURCE_POLICY.allowedExternalSourceTypes.includes(sourceType)) {
    issues.push('external_source_type_rejected');
    return issues;
  }

  if (!hasText(question.sourceName)) issues.push('external_source_name_missing');
  if (!isHttpsUrl(question.sourceUrl)) issues.push('external_source_url_invalid');
  if (!hasText(question.sourceId)) issues.push('external_source_id_missing');
  if (!hasText(question.sourceLicense)) issues.push('external_source_license_missing');
  if (/-NC(?:-|$)/i.test(String(question.sourceLicense || ''))) {
    issues.push('external_source_noncommercial_license');
  } else if (hasText(question.sourceLicense) && !SOURCE_POLICY.allowedLicenses.includes(question.sourceLicense)) {
    issues.push('external_source_license_unapproved');
  }
  if (!isHttpsUrl(question.sourceRightsEvidence)) issues.push('external_source_rights_evidence_missing');
  if (!hasText(question.sourceAttribution)) issues.push('external_source_attribution_missing');
  auditExternalMapping(question, issues);
  return issues;
}

module.exports = {
  SOURCE_POLICY,
  auditQuestionSourceAdmission,
};
