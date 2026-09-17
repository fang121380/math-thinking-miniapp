const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'miniprogram', 'pages', 'intro', 'intro.js');

function loadIntroPage() {
  const events = [];
  const audioContexts = [];
  let storedProgress;
  let captured = null;
  const previous = { wx: global.wx, Page: global.Page, getApp: global.getApp };

  global.getApp = () => ({ globalData: { safeTop: 24 } });
  global.wx = {
    getStorageSync() { return storedProgress; },
    setStorageSync(key, value) { storedProgress = value; },
    createInnerAudioContext() {
      const context = {
        src: '',
        onError() {},
        play() { events.push(`audio:${this.src}`); },
        stop() {},
        destroy() { events.push(`destroy:${this.src}`); },
      };
      audioContexts.push(context);
      return context;
    },
    showToast() {},
    navigateTo() { events.push('navigateTo'); },
    redirectTo() { events.push('redirectTo'); },
  };
  global.Page = (config) => { captured = config; };
  delete require.cache[require.resolve(pagePath)];
  require(pagePath);

  return {
    page: captured,
    events,
    audioContexts,
    cleanup() {
      delete require.cache[require.resolve(pagePath)];
      global.wx = previous.wx;
      global.Page = previous.Page;
      global.getApp = previous.getApp;
    },
  };
}

function createContext(page, events) {
  const context = {
    data: { ...page.data },
    setData(patch) { events.push('setData'); Object.assign(this.data, patch); },
  };
  context.disposeAudio = page.disposeAudio;
  context.notifyAudioFailure = page.notifyAudioFailure;
  context.playSound = page.playSound;
  context.startTest = page.startTest;
  return context;
}

function assertBefore(events, before, after) {
  assert.ok(events.indexOf(before) >= 0, `${before} should be emitted`);
  assert.ok(events.indexOf(before) < events.indexOf(after), `${before} should happen before ${after}`);
}

test('intro preloads shared feedback and plays roles before selection and navigation', () => {
  const runtime = loadIntroPage();
  try {
    const { page, events, audioContexts } = runtime;
    assert.equal(typeof page.onUnload, 'function');
    assert.equal(typeof page.disposeAudio, 'function');
    assert.equal(typeof page.playSound, 'function');

    const context = createContext(page, events);
    page.onShow.call(context);
    assert.ok(audioContexts.length >= 4, 'tap and navigation pools should be preloaded');

    events.length = 0;
    page.selectInitialStage.call(context, { currentTarget: { dataset: { stage: 'primary' } } });
    assertBefore(events, 'audio:/assets/audio/tap.wav', 'setData');

    events.length = 0;
    page.selectInitialGrade.call(context, { currentTarget: { dataset: { grade: 4 } } });
    assertBefore(events, 'audio:/assets/audio/navigate.wav', 'setData');
    assertBefore(events, 'audio:/assets/audio/navigate.wav', 'navigateTo');

    events.length = 0;
    page.startTest.call(context);
    assertBefore(events, 'audio:/assets/audio/navigate.wav', 'navigateTo');

    events.length = 0;
    page.continueHome.call(context);
    assertBefore(events, 'audio:/assets/audio/navigate.wav', 'redirectTo');

    events.length = 0;
    page.onUnload.call(context);
    assert.equal(events.filter((item) => item.startsWith('destroy:')).length, audioContexts.length);
  } finally {
    runtime.cleanup();
  }
});

test('intro ignores a second grade tap while navigation is pending and unlocks after navigation fails', () => {
  const runtime = loadIntroPage();
  try {
    const { page, events } = runtime;
    const context = createContext(page, events);
    let navigationFail;
    global.wx.navigateTo = ({ fail }) => {
      events.push('navigateTo');
      navigationFail = fail;
    };

    page.onShow.call(context);
    page.selectInitialStage.call(context, { currentTarget: { dataset: { stage: 'primary' } } });
    events.length = 0;

    page.selectInitialGrade.call(context, { currentTarget: { dataset: { grade: 4 } } });
    page.selectInitialGrade.call(context, { currentTarget: { dataset: { grade: 4 } } });

    assert.equal(events.filter((event) => event === 'navigateTo').length, 1);
    assert.equal(context.isSelectingGrade, true);

    navigationFail();
    assert.equal(context.isSelectingGrade, false);

    page.selectInitialGrade.call(context, { currentTarget: { dataset: { grade: 4 } } });
    assert.equal(events.filter((event) => event === 'navigateTo').length, 2);
  } finally {
    runtime.cleanup();
  }
});
