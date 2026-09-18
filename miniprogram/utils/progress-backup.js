const BACKUP_FORMAT = 'fan-math-progress';
const BACKUP_VERSION = 1;
const MAX_BACKUP_LENGTH = 500000;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function checksum(value) {
  let hash = 2166136261;
  for (const character of stableStringify(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function createBackupEnvelope(progress, exportedAt = new Date().toISOString()) {
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: String(exportedAt),
    progress,
  };
  return { ...payload, checksum: checksum(payload) };
}

function serializeProgressBackup(progress, exportedAt) {
  const serialized = JSON.stringify(createBackupEnvelope(progress, exportedAt));
  if (serialized.length > MAX_BACKUP_LENGTH) {
    const error = new Error('backup_too_large');
    error.code = 'backup_too_large';
    throw error;
  }
  return serialized;
}

function backupFailure(code) {
  return { ok: false, error: code };
}

function parseProgressBackup(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return backupFailure('empty');
  if (raw.length > MAX_BACKUP_LENGTH) return backupFailure('too_large');

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    return backupFailure('invalid_json');
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return backupFailure('invalid_format');
  }
  if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION) {
    return backupFailure('unsupported_version');
  }
  if (!envelope.progress || typeof envelope.progress !== 'object' || Array.isArray(envelope.progress)) {
    return backupFailure('invalid_progress');
  }
  if (typeof envelope.checksum !== 'string') return backupFailure('missing_checksum');

  const { checksum: providedChecksum, ...payload } = envelope;
  if (checksum(payload) !== providedChecksum) return backupFailure('checksum_mismatch');
  return {
    ok: true,
    progress: envelope.progress,
    exportedAt: envelope.exportedAt,
    version: envelope.version,
  };
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_BACKUP_LENGTH,
  createBackupEnvelope,
  serializeProgressBackup,
  parseProgressBackup,
};
