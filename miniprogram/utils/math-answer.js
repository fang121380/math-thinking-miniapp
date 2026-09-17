function canonicalizeMathAnswer(value) {
  const raw = String(value === undefined || value === null ? '' : value);
  const normalized = typeof raw.normalize === 'function' ? raw.normalize('NFKC') : raw;
  return normalized
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]+/g, '')
    .replace(/[，]/g, ',')
    .replace(/[：:／/∕]/g, '÷')
    .replace(/[＊*xX✕✖]/g, '×')
    .replace(/[−–—－]/g, '-')
    .replace(/[～]/g, '~');
}

function valuesEquivalent(left, right) {
  if (!left || !right) return false;
  const plainNumber = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (plainNumber.test(left) && plainNumber.test(right)) {
    return Number(left) === Number(right);
  }
  return left === right;
}

function canonicalizeAnswerUnit(value) {
  return canonicalizeMathAnswer(value).replace(/°/g, '度');
}

function normalizeAnswerSpec(answerSpec, expected = '') {
  if (!answerSpec || typeof answerSpec !== 'object' || Array.isArray(answerSpec)) {
    return { kind: 'text', value: String(expected === undefined || expected === null ? '' : expected) };
  }
  const supportedKinds = ['text', 'number', 'fraction', 'equation', 'coordinate', 'interval', 'choice'];
  const kind = supportedKinds.includes(answerSpec.kind) ? answerSpec.kind : 'text';
  return {
    ...answerSpec,
    kind,
    value: answerSpec.value === undefined || answerSpec.value === null ? expected : answerSpec.value,
  };
}

function parseFraction(value) {
  const normalized = canonicalizeMathAnswer(value);
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:÷([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = match[2] === undefined ? 1 : Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

function scalarEquivalent(left, right) {
  const leftValue = parseFraction(left);
  const rightValue = parseFraction(right);
  return leftValue !== null && rightValue !== null && Math.abs(leftValue - rightValue) < 1e-12;
}

function equationValue(value, variable) {
  const normalized = canonicalizeMathAnswer(value);
  const parts = normalized.split('=');
  if (parts.length === 1) return normalized;
  if (parts.length !== 2) return null;
  if (parts[0] === variable) return parts[1];
  if (parts[1] === variable) return parts[0];
  return null;
}

function parseCoordinate(value) {
  const normalized = canonicalizeMathAnswer(value).replace(/^\((.*)\)$/, '$1');
  const parts = normalized.split(',');
  return parts.length === 2 && parts.every(Boolean) ? parts : null;
}

function parseInterval(value) {
  const normalized = canonicalizeMathAnswer(value);
  const leftBracket = normalized[0];
  const rightBracket = normalized[normalized.length - 1];
  if (!['[', '('].includes(leftBracket) || ![']', ')'].includes(rightBracket)) return null;
  const parts = normalized.slice(1, -1).split(',');
  if (parts.length !== 2 || parts.some((part) => !part)) return null;
  return { leftBracket, lower: parts[0], upper: parts[1], rightBracket };
}

function compareBySpec(actual, expected, answerSpec) {
  if (answerSpec.kind === 'number') {
    const left = parseFraction(actual);
    const right = parseFraction(expected);
    return left !== null && right !== null && Math.abs(left - right) < 1e-12;
  }
  if (answerSpec.kind === 'fraction') return scalarEquivalent(actual, expected);
  if (answerSpec.kind === 'equation') {
    const variable = canonicalizeMathAnswer(answerSpec.variable || 'x');
    const leftValue = equationValue(actual, variable);
    const rightValue = equationValue(expected, variable);
    return leftValue !== null && rightValue !== null && scalarEquivalent(leftValue, rightValue);
  }
  if (answerSpec.kind === 'coordinate') {
    const left = parseCoordinate(actual);
    const right = parseCoordinate(expected);
    return Boolean(left && right && left.every((value, index) => scalarEquivalent(value, right[index])));
  }
  if (answerSpec.kind === 'interval') {
    const left = parseInterval(actual);
    const right = parseInterval(expected);
    return Boolean(left && right
      && left.leftBracket === right.leftBracket
      && left.rightBracket === right.rightBracket
      && scalarEquivalent(left.lower, right.lower)
      && scalarEquivalent(left.upper, right.upper));
  }
  return valuesEquivalent(actual, expected);
}

function answersEquivalent(actual, expected, answerUnit = '', answerSpec) {
  const left = canonicalizeMathAnswer(actual);
  const spec = normalizeAnswerSpec(answerSpec, expected);
  const right = canonicalizeMathAnswer(spec.value);
  const unit = canonicalizeAnswerUnit(answerUnit);
  if (!unit) return compareBySpec(left, right, spec);

  const unitAwareLeft = unit === '度' ? left.replace(/°/g, '度') : left;
  if (unitAwareLeft.endsWith(unit)) {
    return compareBySpec(unitAwareLeft.slice(0, -unit.length), right, spec);
  }
  return compareBySpec(unitAwareLeft, right, spec);
}

function formatAnswerWithUnit(answer, answerUnit = '') {
  const rawValue = String(answer === undefined || answer === null ? '' : answer).trim();
  const value = canonicalizeMathAnswer(rawValue);
  const unit = canonicalizeAnswerUnit(answerUnit);
  if (!value || !unit) return rawValue;
  const unitAwareValue = unit === '度' ? value.replace(/°/g, '度') : value;
  return unitAwareValue.endsWith(unit) ? rawValue : `${rawValue}${unit}`;
}

function formatChoiceOption(option, answerUnit = '') {
  const raw = String(option === undefined || option === null ? '' : option).trim();
  const normalized = canonicalizeMathAnswer(raw);
  if (!answerUnit || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:÷[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(normalized)) {
    return raw;
  }
  return formatAnswerWithUnit(raw, answerUnit);
}

module.exports = {
  canonicalizeMathAnswer,
  canonicalizeAnswerUnit,
  normalizeAnswerSpec,
  answersEquivalent,
  formatAnswerWithUnit,
  formatChoiceOption,
};
