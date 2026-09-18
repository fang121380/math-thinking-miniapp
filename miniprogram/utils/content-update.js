const CONTENT_PACK_FORMAT = 'fan-math-content-pack-v1';
const CONTENT_PACK_STORAGE_KEY = 'mathThinkingContentPackV1';

function versionParts(version) {
  return String(version || '').split('.').map(Number).filter(Number.isFinite);
}

function isNewerVersion(candidate, current) {
  const next = versionParts(candidate);
  const base = versionParts(current);
  if (!next.length || !base.length) return false;
  const length = Math.max(next.length, base.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (next[index] || 0) - (base[index] || 0);
    if (difference) return difference > 0;
  }
  return false;
}

function isCompatible(minimumAppVersion, appVersion) {
  return !minimumAppVersion || !isNewerVersion(minimumAppVersion, appVersion);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

function contentChecksum(value) {
  let hash = 2166136261;
  for (const character of JSON.stringify(canonicalize(value))) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createContentPack(manifest, questions) {
  const payload = {
    format: CONTENT_PACK_FORMAT,
    version: manifest && manifest.version,
    minimumAppVersion: manifest && manifest.minimumAppVersion,
    manifest,
    questions,
  };
  return { ...payload, checksum: contentChecksum(payload) };
}

function validateContentPack(pack, bundledManifest, appVersion = '1.0.0') {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) return { ok: false, error: 'invalid_pack' };
  if (pack.format !== CONTENT_PACK_FORMAT) return { ok: false, error: 'unsupported_format' };
  if (typeof pack.checksum !== 'string') return { ok: false, error: 'missing_checksum' };
  const { checksum, ...payload } = pack;
  if (contentChecksum(payload) !== checksum) return { ok: false, error: 'checksum_mismatch' };
  if (!pack.manifest || typeof pack.manifest !== 'object' || Array.isArray(pack.manifest)) {
    return { ok: false, error: 'missing_manifest' };
  }
  if (pack.version !== pack.manifest.version || pack.minimumAppVersion !== pack.manifest.minimumAppVersion) {
    return { ok: false, error: 'manifest_mismatch' };
  }
  if (!isCompatible(pack.minimumAppVersion, appVersion)) return { ok: false, error: 'incompatible_app' };
  if (!Array.isArray(pack.questions) || !pack.questions.length) return { ok: false, error: 'empty_questions' };
  const ids = new Set();
  const prompts = new Set();
  for (const question of pack.questions) {
    if (!question || typeof question !== 'object' || !question.id || !question.prompt
      || ids.has(question.id) || prompts.has(question.prompt)) {
      return { ok: false, error: 'invalid_questions' };
    }
    ids.add(question.id);
    prompts.add(question.prompt);
  }
  if (!bundledManifest || !isNewerVersion(pack.version, bundledManifest.version)) {
    return { ok: false, error: 'not_newer' };
  }
  return { ok: true, pack };
}

function selectContentPack({ bundledManifest, candidate, cached, appVersion = '1.0.0' }) {
  const errors = [];
  for (const [source, pack] of [['candidate', candidate], ['cached', cached]]) {
    if (!pack) continue;
    const validation = validateContentPack(pack, bundledManifest, appVersion);
    if (validation.ok) return { source, pack, errors };
    errors.push({ source, error: validation.error });
  }
  return { source: 'bundled', pack: null, errors };
}

function createContentPackStore({ adapter, bundledManifest, appVersion = '1.0.0' }) {
  const readEnvelope = () => {
    const value = adapter && typeof adapter.get === 'function' ? adapter.get(CONTENT_PACK_STORAGE_KEY) : null;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  };

  function load() {
    const stored = readEnvelope();
    const selected = selectContentPack({
      bundledManifest,
      candidate: stored.active,
      cached: stored.previous,
      appVersion,
    });
    return selected;
  }

  function install(pack) {
    const validation = validateContentPack(pack, bundledManifest, appVersion);
    if (!validation.ok) return { source: 'bundled', installed: false, error: validation.error };
    const stored = readEnvelope();
    const next = { active: pack, previous: stored.active || stored.previous || null };
    if (!adapter || typeof adapter.set !== 'function') return { source: 'bundled', installed: false, error: 'storage_unavailable' };
    adapter.set(CONTENT_PACK_STORAGE_KEY, next);
    return { source: 'candidate', installed: true, pack };
  }

  return { load, install };
}

function decideContentUpdate(bundled, remote, appVersion) {
  if (!remote || typeof remote !== 'object' || !remote.contentUrl) return { action: 'bundled' };
  if (!isCompatible(remote.minimumAppVersion, appVersion)) return { action: 'bundled' };
  if (!isNewerVersion(remote.version, bundled.version)) return { action: 'bundled' };
  return { action: 'available', version: remote.version, url: remote.contentUrl };
}

function checkContentUpdate({ wxApi = wx, bundledManifest, appVersion = '1.0.0', onAvailable = () => {} }) {
  const endpoint = bundledManifest && bundledManifest.updateEndpoint;
  if (!endpoint || !/^https:\/\//.test(endpoint) || !wxApi || typeof wxApi.request !== 'function') return;
  wxApi.request({
    url: endpoint,
    method: 'GET',
    timeout: 5000,
    success(response) {
      const decision = decideContentUpdate(bundledManifest, response.data, appVersion);
      if (decision.action === 'available') onAvailable(decision);
    },
    fail() {
      // Keep the bundled offline bank when the update endpoint is unavailable.
    },
  });
}

module.exports = {
  CONTENT_PACK_FORMAT,
  CONTENT_PACK_STORAGE_KEY,
  isNewerVersion,
  decideContentUpdate,
  checkContentUpdate,
  createContentPack,
  validateContentPack,
  selectContentPack,
  createContentPackStore,
};
