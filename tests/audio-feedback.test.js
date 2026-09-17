const test = require('node:test');
const assert = require('node:assert/strict');

const { SOUND_SOURCES, createAudioFeedback } = require('../miniprogram/utils/audio-feedback');

test('audio feedback stays silent when the setting is disabled', () => {
  let created = 0;
  const audio = createAudioFeedback({
    createContext() { created += 1; return {}; },
    isEnabled: () => false,
  });
  assert.equal(audio.play('correct'), false);
  assert.equal(created, 0);
});

test('audio feedback selects the requested bundled sound and plays it', () => {
  const calls = [];
  const context = {
    set src(value) { calls.push(['src', value]); },
    set volume(value) { calls.push(['volume', value]); },
    play() { calls.push(['play']); },
    stop() { calls.push(['stop']); },
    destroy() { calls.push(['destroy']); },
    onEnded(callback) { this.end = callback; },
    onError(callback) { this.fail = callback; },
  };
  const audio = createAudioFeedback({ createContext: () => context, isEnabled: () => true });
  assert.equal(audio.play('wrong'), true);
  assert.ok(calls.some((call) => call[0] === 'src' && call[1].endsWith('/wrong.wav')));
  assert.ok(calls.some((call) => call[0] === 'volume' && call[1] === 1));
  assert.ok(calls.some((call) => call[0] === 'play'));
});

test('audio feedback reports an unavailable audio context without throwing', () => {
  const audio = createAudioFeedback({
    createContext() { throw new Error('audio unavailable'); },
    isEnabled: () => true,
  });
  assert.doesNotThrow(() => audio.play('correct'));
  assert.equal(audio.play('correct'), false);
});

test('audio feedback reports an asynchronous decode failure', () => {
  const failures = [];
  const context = {
    set src(value) {},
    set volume(value) {},
    play() {},
    stop() {},
    destroy() {},
    onEnded() {},
    onError(callback) { this.fail = callback; },
  };
  const audio = createAudioFeedback({
    createContext: () => context,
    isEnabled: () => true,
    onError: (kind) => failures.push(kind),
  });
  audio.play('complete');
  context.fail();
  assert.deepEqual(failures, ['complete']);
});

test('all feedback roles use bundled clips and rapid events do not cancel each other', () => {
  const contexts = [];
  const audio = createAudioFeedback({
    createContext() {
      const context = {
        set src(value) { this.source = value; },
        set volume(value) { this.volumeValue = value; },
        play() { this.played = true; },
        onEnded() {},
        onError() {},
      };
      contexts.push(context);
      return context;
    },
  });
  ['tap', 'move', 'correct', 'wrong', 'complete', 'streak', 'navigate', 'setting'].forEach((kind) => {
    assert.match(SOUND_SOURCES[kind], /^\/assets\/audio\/.+\.wav$/);
  });
  assert.equal(audio.play('tap'), true);
  assert.equal(audio.play('correct'), true);
  assert.equal(contexts.length, 4);
  assert.equal(contexts.filter((context) => context.played).length, 2);
});

test('prepared feedback creates contexts only for page requested roles', () => {
  const contexts = [];
  const audio = createAudioFeedback({
    preloadKinds: ['navigate', 'setting'],
    createContext() {
      const context = { set src(value) { this.source = value; }, set volume(value) {}, onError() {}, play() {} };
      contexts.push(context);
      return context;
    },
  });
  audio.prepare();
  assert.equal(contexts.length, 4);
  assert.deepEqual(contexts.map((context) => context.source).sort(), [
    '/assets/audio/navigate.wav', '/assets/audio/navigate.wav',
    '/assets/audio/setting.wav', '/assets/audio/setting.wav',
  ]);
});

test('prepared feedback pools reuse decoded contexts on the tap path', () => {
  const contexts = [];
  const audio = createAudioFeedback({
    createContext() {
      const context = {
        set src(value) { this.source = value; },
        set volume(value) { this.volumeValue = value; },
        seek(value) { this.seekValue = value; },
        play() { this.played = (this.played || 0) + 1; },
        onEnded() {},
        onError() {},
      };
      contexts.push(context);
      return context;
    },
  });
  audio.prepare();
  const preparedCount = contexts.length;
  assert.equal(preparedCount, Object.keys(SOUND_SOURCES).length * 2);
  audio.play('tap');
  assert.equal(contexts.length, preparedCount);
  assert.ok(contexts.some((context) => context.source.endsWith('/tap.wav') && context.played === 1));
});

test('feedback starts before background music is ducked', () => {
  const calls = [];
  const audio = createAudioFeedback({
    duck: () => calls.push('duck'),
    createContext() {
      return {
        set src(value) {}, set volume(value) {}, onError() {},
        play() { calls.push('play'); },
      };
    },
  });
  audio.play('correct');
  assert.deepEqual(calls, ['play', 'duck']);
});

test('first use of a prepared sound skips the unnecessary native seek', () => {
  const calls = [];
  const audio = createAudioFeedback({
    duck: () => {},
    poolSize: 1,
    createContext() {
      return {
        set src(value) {}, set volume(value) {}, onError() {},
        seek() { calls.push('seek'); },
        play() { calls.push('play'); },
      };
    },
  });
  audio.prepare();
  audio.play('tap');
  assert.deepEqual(calls, ['play']);
});
