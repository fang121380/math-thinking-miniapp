const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { defaultProgress } = require('../miniprogram/utils/storage');
const { getQuestionBank } = require('../miniprogram/utils/question-bank');

const questionPagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'question', 'question.js');
const testPagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'test', 'test.js');
const practicePagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'practice', 'practice.js');

function loadQuestionPage(storedProgress) {
  let page = null;
  let writes = 0;
  const redirects = [];
  const previous = { wx: global.wx, Page: global.Page, getApp: global.getApp };

  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = {
    getStorageSync() { return storedProgress; },
    setStorageSync(key, value) { writes += 1; storedProgress = value; },
    showToast() {},
    redirectTo(options) { redirects.push(options.url); },
    navigateBack() {},
    createInnerAudioContext() {
      return { onError() {}, stop() {}, destroy() {} };
    },
  };
  global.Page = (config) => { page = config; };
  delete require.cache[require.resolve(questionPagePath)];
  require(questionPagePath);

  return {
    page,
    getWrites: () => writes,
    redirects,
    cleanup() {
      delete require.cache[require.resolve(questionPagePath)];
      global.wx = previous.wx;
      global.Page = previous.Page;
      global.getApp = previous.getApp;
    },
  };
}

function loadPage(pagePath, storedProgress) {
  let page = null;
  let writes = 0;
  const redirects = [];
  const navigations = [];
  const previous = { wx: global.wx, Page: global.Page, getApp: global.getApp };

  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = {
    getStorageSync() { return storedProgress; },
    setStorageSync(key, value) { writes += 1; storedProgress = value; },
    showToast() {},
    redirectTo(options) { redirects.push(options.url); },
    navigateTo(options) { navigations.push(options.url); },
    navigateBack() {},
  };
  global.Page = (config) => { page = config; };
  delete require.cache[require.resolve(pagePath)];
  require(pagePath);

  return {
    page,
    getWrites: () => writes,
    redirects,
    navigations,
    cleanup() {
      delete require.cache[require.resolve(pagePath)];
      global.wx = previous.wx;
      global.Page = previous.Page;
      global.getApp = previous.getApp;
    },
  };
}

test('question page does not record an old textbook question after the learner changes scope', () => {
  const rjbQuestion = getQuestionBank({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4,
  }).practiceQuestions.find((item) => (
    item.textbookId === 'rjb' && item.grade === 4 && item.term === '上册'
  ));
  const runtime = loadQuestionPage({
    ...defaultProgress(),
    schoolStage: 'primary',
    textbookId: 'qd',
    grade: 4,
    skillState: {},
    knowledgeState: {},
    mistakes: [],
  });

  try {
    const context = {
      data: {
        question: rjbQuestion,
        answer: rjbQuestion.answer,
        usedHint: false,
        index: 0,
        total: 3,
      },
      questionSessionKey: 'primary:rjb:g4:上册',
      isRecovery: false,
      isRetry: false,
      isSelfPractice: false,
      audio: { play() { return true; } },
      setData() {},
    };

    runtime.page.submitAnswer.call(context);

    assert.equal(runtime.getWrites(), 0);
    assert.deepEqual(runtime.redirects, ['/pages/home/home']);
  } finally {
    runtime.cleanup();
  }
});

test('question page rejects a direct retry ID that belongs to another textbook scope', () => {
  const rjbQuestion = getQuestionBank({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4,
  }).practiceQuestions.find((item) => (
    item.textbookId === 'rjb' && item.grade === 4 && item.term === '上册'
  ));
  const runtime = loadQuestionPage({
    ...defaultProgress(),
    learnerId: 'direct-retry-scope',
    schoolStage: 'primary',
    textbookId: 'qd',
    grade: 4,
  });

  try {
    const context = {
      data: {},
      setData(patch) { Object.assign(this.data, patch); },
      notifyAudioFailure() {},
    };

    runtime.page.initializeQuestion.call(context, { id: rjbQuestion.id });

    assert.equal(context.data.question && context.data.question.id, undefined);
    assert.deepEqual(runtime.redirects, ['/pages/home/home']);
  } finally {
    runtime.cleanup();
  }
});

test('diagnostic page abandons a stale attempt before it records an answer in a new scope', () => {
  const rjbQuestion = getQuestionBank({
    schoolStage: 'primary', textbookId: 'rjb', grade: 4,
  }).diagnosticQuestions.find((item) => (
    item.textbookId === 'rjb' && item.grade === 4 && item.term === '上册'
  ));
  const runtime = loadPage(testPagePath, {
    ...defaultProgress(), schoolStage: 'primary', textbookId: 'qd', grade: 4,
  });

  try {
    let saves = 0;
    const context = {
      data: { answer: rjbQuestion.answer, question: rjbQuestion, usedHint: false, index: 0 },
      diagnosticSessionKey: 'primary:rjb:g4:上册',
      store: {
        load() { return { ...defaultProgress(), schoolStage: 'primary', textbookId: 'qd', grade: 4 }; },
        save() { saves += 1; },
        addMistake() { throw new Error('stale diagnostic must not add a mistake'); },
      },
      audio: { play() { return true; } },
      responses: [],
      questions: [rjbQuestion],
      setData() {},
    };

    runtime.page.submitAnswerSafely.call(context);

    assert.equal(saves, 0);
    assert.deepEqual(runtime.redirects, ['/pages/intro/intro']);
  } finally {
    runtime.cleanup();
  }
});

test('self-practice does not start cached filters after its selected scope changes', () => {
  const runtime = loadPage(practicePagePath, {
    ...defaultProgress(),
    learnerId: 'scope-test',
    schoolStage: 'primary',
    textbookId: 'qd',
    grade: 4,
  });

  try {
    let refreshed = false;
    const context = {
      data: {
        selectedTopic: 'all', selectedType: 'all', selectedDifficulty: 'medium', selectedGoal: 3,
      },
      practiceSessionKey: 'primary:rjb:g4:上册',
      audio: { play() { return true; } },
      refreshPracticeScope() { refreshed = true; },
    };

    runtime.page.startPractice.call(context);

    assert.equal(refreshed, true);
    assert.equal(runtime.getWrites(), 0);
    assert.deepEqual(runtime.navigations, []);
  } finally {
    runtime.cleanup();
  }
});
