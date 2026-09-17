function normalizePrompt(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[：:]/g, '');
}

function normalizeExpression(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/');
}

function questionContentSignature(item = {}) {
  const prompt = normalizePrompt(item.prompt);
  const expression = normalizeExpression(item.calculationExpression);
  const answer = String(item.answer === undefined || item.answer === null ? '' : item.answer).trim();
  const answerUnit = String(item.answerUnit || '').trim();
  return expression
    ? [prompt, expression, answer, answerUnit].join('|')
    : [prompt, answer, answerUnit].join('|');
}

function normalizeContentSignatures(value, limit = 1200) {
  const signatures = Array.isArray(value) ? value : [];
  return Array.from(new Set(signatures
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())))
    .slice(-limit);
}

module.exports = {
  questionContentSignature,
  normalizeContentSignatures,
};
