const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { BGM_TRACKS, createBackgroundMusic } = require('../miniprogram/utils/background-music');

test('background playlist contains ten compact classical tracks with tracked licenses', () => {
  assert.deepEqual(BGM_TRACKS.map((item) => item.id), [
    'fur-elise',
    'turkish-march',
    'bach-minuet',
    'ode-to-joy',
    'bach-cello-prelude',
    'bach-prelude-c-major',
    'beethoven-eroica-scherzo',
    'tchaikovsky-piano-concerto',
    'beethoven-pathetique',
    'mozart-sonata-14',
  ]);
  assert.ok(BGM_TRACKS.every((item) => item.source.startsWith('/assets/audio/bgm/') && item.source.endsWith('.mp3')));
  assert.ok(BGM_TRACKS.every((item) => !item.subpackage && !item.root));
  assert.deepEqual(BGM_TRACKS.slice(3).map((item) => item.license), ['PDM', 'CC0', 'CC0', 'CC0', 'CC0', 'CC0', 'CC0']);
});

test('background music starts a selected main-package track without a subpackage gate', () => {
  const calls = [];
  const music = createBackgroundMusic({
    loadSubPackage() { throw new Error('main-package audio must not load a subpackage'); },
    createContext: () => ({
      set src(value) { calls.push(['src', value]); }, set loop(value) {}, set volume(value) {}, play() { calls.push(['play']); },
    }),
  });
  assert.equal(music.sync(true, 1), true);
  assert.ok(calls.some((call) => call[0] === 'src' && call[1] === BGM_TRACKS[1].source));
  assert.ok(calls.some((call) => call[0] === 'play'));
});

test('background music waits for native readiness before the first playback', () => {
  const calls = [];
  let canPlay;
  const music = createBackgroundMusic({
    createContext: () => ({
      set src(value) { calls.push(['src', value]); },
      set loop(value) {}, set volume(value) {},
      onCanplay(callback) { canPlay = callback; },
      play() { calls.push(['play']); },
    }),
  });

  music.sync(true, 0);
  assert.deepEqual(calls.map((call) => call[0]), ['src']);
  canPlay();
  assert.deepEqual(calls.map((call) => call[0]), ['src', 'play']);
});

test('repeated sync still waits for native readiness and starts only once', () => {
  const calls = [];
  let canPlay;
  const music = createBackgroundMusic({
    createContext: () => ({
      set src(value) { calls.push(['src', value]); },
      set loop(value) {}, set volume(value) {},
      onCanplay(callback) { canPlay = callback; },
      play() { calls.push(['play']); },
    }),
  });

  music.sync(true, 0);
  music.sync(true, 0);
  assert.equal(calls.filter((call) => call[0] === 'play').length, 0);
  canPlay();
  assert.equal(calls.filter((call) => call[0] === 'play').length, 1);
});

test('a failed native load is retried when background music is synced again', () => {
  const calls = [];
  let fail;
  const music = createBackgroundMusic({
    createContext: () => ({
      set src(value) { calls.push(['src', value]); },
      set loop(value) {}, set volume(value) {},
      onCanplay() {},
      onError(callback) { fail = callback; },
      play() { calls.push(['play']); },
    }),
  });

  music.sync(true, 0);
  fail({ errCode: 10001, errMsg: 'native load failed' });
  music.sync(true, 0);
  assert.equal(calls.filter((call) => call[0] === 'src').length, 2);
});

test('switching back to a track keeps only one native readiness listener', () => {
  const calls = [];
  let canPlayListeners = [];
  const context = {
    set src(value) { calls.push(['src', value]); },
    set loop(value) {}, set volume(value) {},
    onCanplay(callback) { canPlayListeners.push(callback); },
    offCanplay(callback) { canPlayListeners = canPlayListeners.filter((item) => item !== callback); },
    play() { calls.push(['play']); },
  };
  const music = createBackgroundMusic({ createContext: () => context });

  music.sync(true, 0);
  music.sync(true, 1);
  music.sync(true, 0);
  canPlayListeners.slice().forEach((callback) => callback());
  assert.equal(calls.filter((call) => call[0] === 'play').length, 1);
});

test('background music is silent until the learner enables it', () => {
  let created = 0;
  const music = createBackgroundMusic({
    createContext() { created += 1; return {}; },
  });
  assert.equal(music.sync(false), false);
  assert.equal(created, 0);
});

test('background music loops quietly and ducks under feedback', () => {
  const calls = [];
  let restore;
  const context = {
    set src(value) { calls.push(['src', value]); },
    set loop(value) { calls.push(['loop', value]); },
    set volume(value) { calls.push(['volume', value]); },
    play() { calls.push(['play']); },
    pause() { calls.push(['pause']); },
    stop() { calls.push(['stop']); },
    destroy() { calls.push(['destroy']); },
  };
  const music = createBackgroundMusic({
    createContext: () => context,
    setTimeout(callback) { restore = callback; return 1; },
    clearTimeout() {},
  });
  assert.equal(music.sync(true, 1), true);
  assert.ok(calls.some((call) => call[0] === 'src' && call[1] === BGM_TRACKS[1].source));
  assert.ok(calls.some((call) => call[0] === 'loop' && call[1] === true));
  music.duck();
  assert.ok(calls.some((call) => call[0] === 'volume' && call[1] < 0.1));
  restore();
  assert.ok(calls.some((call) => call[0] === 'volume' && call[1] === 0.12));
  music.pause();
  assert.ok(calls.some((call) => call[0] === 'pause'));
});

test('one action advances the current background track and restarts playback', () => {
  const calls = [];
  const music = createBackgroundMusic({
    createContext: () => ({
      set src(value) { calls.push(['src', value]); }, set loop(value) {}, set volume(value) {},
      play() { calls.push(['play']); }, pause() {}, stop() {}, destroy() {}, seek() { calls.push(['seek']); },
    }),
  });
  music.sync(true, 0);
  assert.equal(music.nextTrack(), 1);
  assert.ok(calls.some((call) => call[0] === 'src' && call[1] === BGM_TRACKS[1].source));
});

test('learning pages keep enabled background music playing under answer feedback', () => {
  ['test', 'question', 'analysis', 'result'].forEach((page) => {
    const source = fs.readFileSync(path.join(__dirname, `../miniprogram/pages/${page}/${page}.js`), 'utf8');
    assert.doesNotMatch(source, /pauseBackgroundMusic/);
    assert.match(source, /syncBackgroundMusic\(progress\.bgmEnabled, progress\.bgmTrackIndex\)/);
  });
});
