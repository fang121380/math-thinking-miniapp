const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonicalizeMathAnswer,
  answersEquivalent,
  formatAnswerWithUnit,
  normalizeAnswerSpec,
} = require('../miniprogram/utils/math-answer');

test('formula spacing from the screenshot does not change correctness', () => {
  assert.equal(answersEquivalent('(48+12) ÷6', '(48+12)÷6'), true);
  assert.equal(answersEquivalent('(48+12)\u3000÷\u00a06', '(48+12)÷6'), true);
  assert.equal(answersEquivalent('(48+12)\u200b÷6', '(48+12)÷6'), true);
});

test('full-width punctuation and division aliases canonicalize identically', () => {
  assert.equal(answersEquivalent('（48＋12）：6', '(48+12)÷6'), true);
  assert.equal(answersEquivalent('(48+12)/6', '(48+12)÷6'), true);
  assert.equal(answersEquivalent('(48+12):6', '(48+12)÷6'), true);
});

test('multiplication and minus aliases canonicalize identically', () => {
  assert.equal(answersEquivalent('18x24−12*20', '18×24-12×20'), true);
  assert.equal(answersEquivalent('18 X 24－12 × 20', '18×24-12×20'), true);
});

test('normal text and Chinese punctuation retain the prior tolerant behavior', () => {
  assert.equal(canonicalizeMathAnswer(' 20～40 '), '20~40');
  assert.equal(answersEquivalent('三个正方形横排', '三个正方形横排'), true);
  assert.equal(answersEquivalent('2，4，6', '2,4,6'), true);
});

test('different mathematical structures are not treated as formatting variants', () => {
  assert.equal(answersEquivalent('(48+12)×6', '(48+12)÷6'), false);
  assert.equal(answersEquivalent('48+12÷6', '(48+12)÷6'), false);
  assert.equal(answersEquivalent('10', '(48+12)÷6'), false);
  assert.equal(answersEquivalent('', '(48+12)÷6'), false);
});

test('equivalent numeric forms are accepted without weakening formula comparison', () => {
  assert.equal(answersEquivalent('2', '2.0'), true);
  assert.equal(answersEquivalent('02.500', '2.5'), true);
  assert.equal(answersEquivalent('-0', '0.0'), true);
  assert.equal(answersEquivalent('2+3', '5'), false);
});

test('numeric answers accept their required unit but reject a different unit', () => {
  assert.equal(answersEquivalent('80米', '80', '米'), true);
  assert.equal(answersEquivalent('80 米', '80', '米'), true);
  assert.equal(answersEquivalent('80', '80', '米'), true);
  assert.equal(answersEquivalent('80厘米', '80', '米'), false);
  assert.equal(answersEquivalent('80米', '80'), false);
});

test('displayed numeric answers include the expected unit once', () => {
  assert.equal(formatAnswerWithUnit('80', '米'), '80米');
  assert.equal(formatAnswerWithUnit('80米', '米'), '80米');
  assert.equal(formatAnswerWithUnit('9:30', ''), '9:30');
});

test('structured junior answer contracts compare mathematical values', () => {
  assert.deepEqual(normalizeAnswerSpec(undefined, 'plain'), { kind: 'text', value: 'plain' });
  assert.equal(answersEquivalent('x=5', '5', '', { kind: 'equation', variable: 'x', value: '5' }), true);
  assert.equal(answersEquivalent('5', '5', '', { kind: 'equation', variable: 'x', value: '5' }), true);
  assert.equal(answersEquivalent('x=6', '5', '', { kind: 'equation', variable: 'x', value: '5' }), false);
  assert.equal(answersEquivalent('(2,-3)', '2,-3', '', { kind: 'coordinate', value: '2,-3' }), true);
  assert.equal(answersEquivalent('(2,-4)', '2,-3', '', { kind: 'coordinate', value: '2,-3' }), false);
  assert.equal(answersEquivalent('2/4', '1/2', '', { kind: 'fraction', value: '1/2' }), true);
  assert.equal(answersEquivalent('3/4', '1/2', '', { kind: 'fraction', value: '1/2' }), false);
  assert.equal(answersEquivalent('[1,3)', '[1,3)', '', { kind: 'interval', value: '[1,3)' }), true);
  assert.equal(answersEquivalent('(1,3)', '[1,3)', '', { kind: 'interval', value: '[1,3)' }), false);
});

test('structured answer contracts reject matching non-numeric shapes', () => {
  assert.equal(answersEquivalent('abc/abc', 'abc/abc', '', { kind: 'fraction', value: 'abc/abc' }), false);
  assert.equal(answersEquivalent('x=abc', 'abc', '', { kind: 'equation', variable: 'x', value: 'abc' }), false);
  assert.equal(answersEquivalent('(a,b)', 'a,b', '', { kind: 'coordinate', value: 'a,b' }), false);
  assert.equal(answersEquivalent('[a,b)', '[a,b)', '', { kind: 'interval', value: '[a,b)' }), false);
});
