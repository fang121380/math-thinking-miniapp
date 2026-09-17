const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'test', 'test.js');

function loadTestPage(storedProgress) {
  const events = [];
  let captured = null;
  const previous = { wx: global.wx, Page: global.Page, getApp: global.getApp };

  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = {
    getStorageSync() { return storedProgress; },
    setStorageSync(key, value) { storedProgress = value; },
    redirectTo(options) { events.push(options.url); },
    showToast() {},
  };
  global.Page = (config) => { captured = config; };
  delete require.cache[require.resolve(pagePath)];
  require(pagePath);

  return {
    page: captured,
    events,
    cleanup() {
      delete require.cache[require.resolve(pagePath)];
      global.wx = previous.wx;
      global.Page = previous.Page;
      global.getApp = previous.getApp;
    },
  };
}

test('diagnostic page redirects unconfirmed learners to grade selection without initializing questions', () => {
  const runtime = loadTestPage({ initialGradeConfirmed: false });
  try {
    let initialized = false;
    runtime.page.onLoad.call({
      initializeAttempt() { initialized = true; },
    });

    assert.deepEqual(runtime.events, ['/pages/intro/intro']);
    assert.equal(initialized, false);
  } finally {
    runtime.cleanup();
  }
});
