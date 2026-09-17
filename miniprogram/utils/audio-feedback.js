const { duckBackgroundMusic } = require('./background-music');

const SOUND_SOURCES = {
  tap: '/assets/audio/tap.wav',
  move: '/assets/audio/move.wav',
  correct: '/assets/audio/correct.wav',
  wrong: '/assets/audio/wrong.wav',
  complete: '/assets/audio/complete.wav',
  streak: '/assets/audio/streak.wav',
  navigate: '/assets/audio/navigate.wav',
  setting: '/assets/audio/setting.wav',
};

function createAudioFeedback({
  createContext = () => wx.createInnerAudioContext(),
  isEnabled = () => true,
  onError = () => {},
  duck = duckBackgroundMusic,
  eager = false,
  poolSize = 2,
  preloadKinds,
} = {}) {
  const pools = {};
  const cursors = {};
  const startedContexts = new WeakSet();

  function createPreparedContext(kind) {
    const context = createContext();
    context.volume = 1;
    context.src = SOUND_SOURCES[kind];
    if (typeof context.onError === 'function') context.onError((error) => onError(kind, error));
    return context;
  }

  function ensurePool(kind) {
    if (!SOUND_SOURCES[kind]) return [];
    if (!pools[kind]) {
      pools[kind] = Array.from({ length: poolSize }, () => createPreparedContext(kind));
      cursors[kind] = 0;
    }
    return pools[kind];
  }

  function prepare() {
    if (!isEnabled()) return false;
    try {
      const kinds = Array.isArray(preloadKinds) && preloadKinds.length
        ? preloadKinds
        : Object.keys(SOUND_SOURCES);
      kinds.forEach((kind) => ensurePool(kind));
      return true;
    } catch (error) {
      onError('prepare', error);
      return false;
    }
  }

  function play(kind) {
    if (!isEnabled() || !SOUND_SOURCES[kind]) return false;
    try {
      const pool = ensurePool(kind);
      const index = cursors[kind] % pool.length;
      cursors[kind] += 1;
      const context = pool[index];
      if (startedContexts.has(context) && typeof context.seek === 'function') context.seek(0);
      context.play();
      startedContexts.add(context);
      duck();
      return true;
    } catch (error) {
      onError(kind, error);
      return false;
    }
  }

  function destroy() {
    Object.keys(pools).forEach((kind) => {
      pools[kind].forEach((context) => {
        try { if (typeof context.stop === 'function') context.stop(); } catch (error) {}
        try { if (typeof context.destroy === 'function') context.destroy(); } catch (error) {}
      });
    });
  }

  const audio = { prepare, play, destroy };
  if (eager) prepare();
  return audio;
}

module.exports = { SOUND_SOURCES, createAudioFeedback };
