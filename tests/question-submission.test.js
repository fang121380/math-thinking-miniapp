const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultProgress } = require('../miniprogram/utils/storage');
const { getQuestionBank } = require('../miniprogram/utils/question-bank');
const { CONTENT_BANK_VERSION } = require('../miniprogram/utils/adaptive');
const pagePath = require.resolve('../miniprogram/pages/question/question');

function fixture(t, options = {}) {
  const original = { wx: global.wx, Page: global.Page, getApp: global.getApp };
  const q = getQuestionBank(defaultProgress()).practiceQuestions.find(q => q.term === '上册');
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let stored = { ...defaultProgress(), learnerId: 'submit-test', soundEnabled: false,
    dailySetDate: date, dailyMissionMode: 'challenge', dailyQuestionIds: [q.id],
    contentBankVersion: CONTENT_BANK_VERSION };
  let page, writes = 0, failSave = false;
  const redirects = [];
  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = {
    getStorageSync: () => structuredClone(stored),
    setStorageSync(key, value) { if (failSave) throw Error('disk full'); writes++; stored = structuredClone(value); },
    showToast() {}, redirectTo(o) { redirects.push(o.url); },
  };
  global.Page = config => { page = config; };
  delete require.cache[pagePath]; require(pagePath);
  t.after(() => { Object.assign(global, original); delete require.cache[pagePath]; });
  const ctx = { ...page, data: structuredClone(page.data),
    setData(patch) { Object.assign(this.data, patch); },
  };
  ctx.initializeQuestion(options);
  ctx.audio = { play: () => true };
  ctx.data.answer = ctx.data.question.answer;
  return { ctx, redirects, inspect: () => structuredClone(stored), writes: () => writes,
    update(patch) { Object.assign(stored, patch); }, fail(value) { failSave = value; } };
}

test('double submission awards stars and updates mastery only once', t => {
  const f = fixture(t, { index: 2 });
  f.ctx.submitAnswer();
  const saved = f.inspect(); const writes = f.writes();
  f.ctx.submitAnswer();
  assert.equal(f.writes(), writes);
  assert.deepEqual(f.inspect(), saved);
  assert.equal(saved.stars, 1);
  assert.equal(saved.completionDates.length, 1);
});

test('wrong answer double submission only records one adaptive outcome and navigation', t => {
  const f = fixture(t); f.ctx.data.answer = 'incorrect';
  f.ctx.submitAnswer(); const saved = f.inspect();
  f.ctx.submitAnswer();
  assert.deepEqual(f.inspect(), saved);
  assert.equal(f.redirects.length, 1);
});

test('a failed save can be retried without losing or duplicating the answer', t => {
  const f = fixture(t, { index: 2 }); const saved = f.inspect();
  f.fail(true); f.ctx.submitAnswer(); assert.deepEqual(f.inspect(), saved);
  f.fail(false); f.ctx.submitAnswer(); assert.equal(f.inspect().stars, 1);
  f.ctx.submitAnswer(); assert.equal(f.inspect().stars, 1);
});

test('a daily question left open across midnight cannot count for a new day', t => {
  const f = fixture(t); f.update({ dailySetDate: '2000-01-01' });
  const before = f.inspect(); const writes = f.writes(); f.ctx.submitAnswer();
  assert.equal(f.writes(), writes); assert.deepEqual(f.inspect(), before);
  assert.equal(f.redirects.at(-1), '/pages/home/home');
});

test('replaced self-practice questions cannot accept an answer from the previous set', t => {
  const f = fixture(t, { id: getQuestionBank(defaultProgress()).practiceQuestions.find(q => q.term === '上册').id });
  // Initialize a real self-practice session, then replace it without changing grade or term.
  const id = f.ctx.data.question.id;
  f.update({ selfPracticeQuestionIds: [id], selfPracticeFilters: { attemptNonce: 1 } });
  f.ctx.initializeQuestion({ source: 'self' }); f.ctx.audio = { play: () => true };
  f.ctx.data.answer = f.ctx.data.question.answer;
  f.update({ selfPracticeFilters: { attemptNonce: 2 } });
  const before = f.inspect(); f.ctx.submitAnswer();
  assert.deepEqual(f.inspect(), before);
  assert.equal(f.redirects.at(-1), '/pages/practice/practice');
});
