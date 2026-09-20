const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'game', 'game.js');

function loadGamePage() {
  const previous = { Page: global.Page, getApp: global.getApp };
  let captured = null;
  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.Page = (config) => { captured = config; };
  delete require.cache[require.resolve(pagePath)];
  require(pagePath);
  return {
    page: captured,
    cleanup() {
      delete require.cache[require.resolve(pagePath)];
      global.Page = previous.Page;
      global.getApp = previous.getApp;
    },
  };
}

test('construct hint teaches an equality check instead of forcing one hidden token order', () => {
  const runtime = loadGamePage();
  try {
    const context = {
      data: { ...runtime.page.data, loading: false, complete: false },
      round: {
        challenge: {
          type: 'change-maker',
          mode: 'construct',
          expectedTokenIds: ['paid', 'minus', 'price', 'equals', 'change'],
          palette: [
            { id: 'paid', label: '10元' },
            { id: 'minus', label: '-' },
            { id: 'price', label: '6元' },
            { id: 'equals', label: '=' },
            { id: 'change', label: '4元' },
          ],
        },
        player: { placedTokenIds: [] },
      },
      playSound() {},
      setData(patch) { Object.assign(this.data, patch); },
    };
    runtime.page.hint.call(context);
    assert.match(context.data.feedbackText, /等式/);
    assert.doesNotMatch(context.data.feedbackText, /下一步试着放/);
  } finally {
    runtime.cleanup();
  }
});

test('logic seating hint teaches seat constraints instead of an equality', () => {
  const runtime = loadGamePage();
  try {
    const context = {
      data: { ...runtime.page.data, loading: false, complete: false },
      round: {
        challenge: { type: 'logic-seats', mode: 'construct', palette: [] },
        player: { placedTokenIds: [] },
      },
      playSound() {},
      setData(patch) { Object.assign(this.data, patch); },
    };

    runtime.page.hint.call(context);

    assert.match(context.data.feedbackText, /\u6700\u5de6|\u6700\u53f3|\u7d27\u6328/);
    assert.doesNotMatch(context.data.feedbackText, /\u7b49\u53f7/);
  } finally {
    runtime.cleanup();
  }
});

test('shape hunt hint asks for a unique feature while calculation matching keeps result wording', () => {
  const runtime = loadGamePage();
  try {
    const makeContext = (type) => ({
      data: { ...runtime.page.data, loading: false, complete: false },
      round: {
        challenge: {
          type,
          mode: 'matching',
          cards: [
            { id: 'left', pairId: 'pair-0', label: 'left' },
            { id: 'right', pairId: 'pair-0', label: 'right' },
          ],
        },
        player: { matchedPairIds: [] },
      },
      playSound() {},
      setData(patch) { Object.assign(this.data, patch); },
    });

    const shapeContext = makeContext('shape-hunt');
    runtime.page.hint.call(shapeContext);
    assert.match(shapeContext.data.feedbackText, /\u7279\u5f81/);
    assert.doesNotMatch(shapeContext.data.feedbackText, /\u540c\u4e00\u4e2a\u7ed3\u679c/);

    const calculationContext = makeContext('calculation-match');
    runtime.page.hint.call(calculationContext);
    assert.match(calculationContext.data.feedbackText, /\u540c\u4e00\u4e2a\u7ed3\u679c/);
  } finally {
    runtime.cleanup();
  }
});

test('a generated repeat is explicitly presented as a review round', () => {
  const runtime = loadGamePage();
  try {
    const context = {
      data: { ...runtime.page.data },
      type: 'partition',
      setData(patch) { Object.assign(this.data, patch); },
    };
    runtime.page.renderRound.call(context, {
      challenge: {
        type: 'partition',
        difficulty: 'easy',
        title: '把图形分成相等的两份',
        instruction: '点亮一半格子。',
        repeatExhausted: true,
        cells: [
          { row: 0, column: 0, key: '0-0' },
          { row: 0, column: 1, key: '0-1' },
          { row: 1, column: 0, key: '1-0' },
          { row: 1, column: 1, key: '1-1' },
        ],
        rows: 2,
        columns: 2,
        targetCount: 2,
      },
      player: { selectedKeys: [] },
    });
    assert.match(context.data.feedbackText, /复习/);
    assert.equal(context.data.feedbackKind, 'hint');
  } finally {
    runtime.cleanup();
  }
});

test('a visible choice round checks its selected answer even when legacy data omitted the mode', () => {
  const runtime = loadGamePage();
  try {
    let completed = false;
    const context = {
      data: { ...runtime.page.data, loading: false, complete: false, mode: 'choice', selectedAnswer: 42 },
      type: 'pattern',
      round: {
        challenge: { type: 'pattern', answer: 42 },
        player: { selectedAnswer: 42 },
      },
      finishRound() { completed = true; },
      playSound() {},
      showFeedback() {},
    };

    runtime.page.checkAnswer.call(context);

    assert.equal(completed, true);
  } finally {
    runtime.cleanup();
  }
});

test('interleaved pattern hint names both visible groups and their steps', () => {
  const runtime = loadGamePage();
  try {
    const context = {
      data: { ...runtime.page.data, loading: false, complete: false },
      round: {
        challenge: {
          type: 'pattern',
          mode: 'choice',
          explanation: '第1、3、5个数是 18、30、42，每次加 12；第2、4个数是 34、44，每次加 10。',
        },
        player: { selectedAnswer: null },
      },
      type: 'pattern',
      playSound() {},
      setData(patch) { Object.assign(this.data, patch); },
    };

    runtime.page.hint.call(context);

    assert.match(context.data.feedbackText, /第1、3、5个数是 18、30、42/);
    assert.match(context.data.feedbackText, /第2、4个数是 34、44/);
  } finally {
    runtime.cleanup();
  }
});
