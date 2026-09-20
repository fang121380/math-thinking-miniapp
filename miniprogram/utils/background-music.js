const WIKIMEDIA_TRANSCODE_ROOT = 'https://upload.wikimedia.org/wikipedia/commons/transcoded';

function wikimediaMp3(hashPath, fileName) {
  const encodedName = encodeURIComponent(fileName);
  return `${WIKIMEDIA_TRANSCODE_ROOT}/${hashPath}/${encodedName}/${encodedName}.mp3`;
}

const BGM_TRACKS = [
  { id: 'fur-elise', label: '致爱丽丝', source: wikimediaMp3('7/7b', 'FurElise.ogg'), license: 'CC0' },
  { id: 'turkish-march', label: '土耳其进行曲', source: wikimediaMp3('4/4e', 'Mozart-Marsz_turecki-(Romuald_Greiss).ogg'), license: 'PDM' },
  { id: 'bach-minuet', label: 'G大调小步舞曲', source: wikimediaMp3('2/25', 'Minuet_in_G_major,_Anh._114_-_Notebook_for_Anna_Magdalena_Bach.ogg'), license: 'PDM' },
  { id: 'ode-to-joy', label: '欢乐颂', source: wikimediaMp3('f/f7', 'Ode_to_Joy.ogg'), license: 'PDM' },
  { id: 'bach-cello-prelude', label: '巴赫大提琴前奏曲', source: wikimediaMp3('a/a7', 'Bach_Cello_Suite_1_Prelude_(BWV_1007)_Played_by_Chris.ogg'), license: 'CC0' },
  { id: 'bach-prelude-c-major', label: '巴赫 C 大调前奏曲', source: wikimediaMp3('b/b6', 'Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg'), license: 'CC0' },
  { id: 'beethoven-eroica-scherzo', label: '英雄交响曲谐谑曲', source: wikimediaMp3('0/07', 'Beethoven_SymphonyNo.3Eroica_LudwigVanBeethoven-SymphonyNo.3InEFlatMajorEroicaOp.55-03-ScherzoAllegroVivace.ogg'), license: 'CC0' },
  { id: 'tchaikovsky-piano-concerto', label: '柴可夫斯基第一钢琴协奏曲', source: wikimediaMp3('4/48', 'Tchaikovsky,_Concerto_No.1_in_B-flat_minor_Op.23,_I._Allegro.ogg'), license: 'CC0' },
  { id: 'beethoven-pathetique', label: '悲怆奏鸣曲慢板', source: wikimediaMp3('6/63', 'Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg'), license: 'CC0' },
  { id: 'mozart-sonata-14', label: '莫扎特第十四钢琴奏鸣曲', source: wikimediaMp3('8/86', 'Mozart_-_Piano_Sonata_No._14.ogg'), license: 'CC0' },
];
const BGM_SOURCE = BGM_TRACKS[0].source;
const BASE_VOLUME = 0.12;
const DUCK_VOLUME = 0.045;
const DUCK_DURATION = 250;

function normalizeTrackIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < BGM_TRACKS.length ? index : 0;
}

function createBackgroundMusic({
  createContext = () => wx.createInnerAudioContext(),
  setTimeout: schedule = setTimeout,
  clearTimeout: cancel = clearTimeout,
  onError = () => {},
} = {}) {
  let context = null;
  let enabled = false;
  let restoreTimer = null;
  let trackIndex = 0;
  let sourceLoaded = false;
  let loadedTrackIndex = -1;
  let playableTrackIndex = -1;
  let canPlayHandler = null;

  function ensureContext() {
    if (context) return context;
    context = createContext();
    context.loop = true;
    context.volume = BASE_VOLUME;
    return context;
  }

  function loadTrack(nextIndex, onReady) {
    trackIndex = normalizeTrackIndex(nextIndex);
    const player = ensureContext();
    playableTrackIndex = -1;
    const ready = () => {
      if (trackIndex !== normalizeTrackIndex(nextIndex)) return;
      playableTrackIndex = trackIndex;
      if (onReady) onReady(player);
    };
    if (canPlayHandler && typeof player.offCanplay === 'function') player.offCanplay(canPlayHandler);
    canPlayHandler = ready;
    if (typeof player.onCanplay === 'function') player.onCanplay(canPlayHandler);
    if (typeof player.onError === 'function') {
      player.onError((error) => {
        if (player === context) {
          sourceLoaded = false;
          loadedTrackIndex = -1;
          playableTrackIndex = -1;
        }
        onError(error);
      });
    }
    player.src = BGM_TRACKS[trackIndex].source;
    sourceLoaded = true;
    loadedTrackIndex = trackIndex;
    if (typeof player.onCanplay !== 'function') ready();
    return player;
  }

  function playTrack(nextIndex) {
    trackIndex = normalizeTrackIndex(nextIndex);
    const start = (player) => {
      if (!enabled || trackIndex !== normalizeTrackIndex(nextIndex)) return;
      player.volume = BASE_VOLUME;
      player.play();
    };
    if (!sourceLoaded || loadedTrackIndex !== trackIndex) {
      loadTrack(trackIndex, start);
    } else if (playableTrackIndex === trackIndex) {
      start(ensureContext());
    }
  }

  function sync(nextEnabled, nextTrackIndex = trackIndex) {
    enabled = Boolean(nextEnabled);
    if (!enabled) {
      pause();
      return false;
    }
    const normalizedIndex = normalizeTrackIndex(nextTrackIndex);
    if (!sourceLoaded || normalizedIndex !== loadedTrackIndex) playTrack(normalizedIndex);
    else if (playableTrackIndex === normalizedIndex) {
      const player = ensureContext();
      player.volume = BASE_VOLUME;
      player.play();
    }
    return true;
  }

  function nextTrack() {
    const nextIndex = (trackIndex + 1) % BGM_TRACKS.length;
    if (enabled) playTrack(nextIndex);
    else trackIndex = nextIndex;
    return nextIndex;
  }

  function duck() {
    if (!enabled || !context) return false;
    context.volume = DUCK_VOLUME;
    if (restoreTimer !== null) cancel(restoreTimer);
    restoreTimer = schedule(() => {
      restoreTimer = null;
      if (enabled && context) context.volume = BASE_VOLUME;
    }, DUCK_DURATION);
    return true;
  }

  function pause() {
    if (restoreTimer !== null) {
      cancel(restoreTimer);
      restoreTimer = null;
    }
    if (context && typeof context.pause === 'function') context.pause();
  }

  function destroy() {
    pause();
    if (context && canPlayHandler && typeof context.offCanplay === 'function') context.offCanplay(canPlayHandler);
    if (context && typeof context.stop === 'function') context.stop();
    if (context && typeof context.destroy === 'function') context.destroy();
    context = null;
    canPlayHandler = null;
    sourceLoaded = false;
    loadedTrackIndex = -1;
    playableTrackIndex = -1;
  }

  return { sync, nextTrack, duck, pause, destroy };
}

const sharedMusic = createBackgroundMusic({ onError: (error) => console.warn('[BGM]', error) });
function syncBackgroundMusic(enabled, trackIndex) { return sharedMusic.sync(enabled, trackIndex); }
function nextBackgroundTrack() { return sharedMusic.nextTrack(); }
function duckBackgroundMusic() { return sharedMusic.duck(); }
function pauseBackgroundMusic() { return sharedMusic.pause(); }

module.exports = {
  BGM_TRACKS,
  BGM_SOURCE,
  BASE_VOLUME,
  normalizeTrackIndex,
  createBackgroundMusic,
  syncBackgroundMusic,
  nextBackgroundTrack,
  duckBackgroundMusic,
  pauseBackgroundMusic,
};
