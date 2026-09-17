const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { formatChoiceOption } = require('../miniprogram/utils/math-answer');

test('numeric choice options display the question unit while text options stay unchanged', () => {
  assert.equal(formatChoiceOption('90', '度'), '90度');
  assert.equal(formatChoiceOption('12.5', '厘米'), '12.5厘米');
  assert.equal(formatChoiceOption('无法确定', '厘米'), '无法确定');
  assert.equal(formatChoiceOption('1/2', ''), '1/2');
});

test('question and diagnostic pages bind rendered labels but keep raw answer values', () => {
  const miniprogram = path.join(__dirname, '..', 'miniprogram');
  ['pages/question/question.wxml', 'pages/test/test.wxml'].forEach((relative) => {
    const source = fs.readFileSync(path.join(miniprogram, relative), 'utf8');
    assert.match(source, /question\.displayOptions/);
    assert.match(source, /data-value="\{\{item\.value\}\}"/);
    assert.match(source, /\{\{item\.label\}\}/);
  });
});
