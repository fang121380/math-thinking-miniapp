const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackupEnvelope,
  serializeProgressBackup,
  parseProgressBackup,
} = require('../miniprogram/utils/progress-backup');

test('progress backup is versioned and round-trips a local progress record', () => {
  const progress = { stars: 4, mistakes: [{ id: 'm-1' }], grade: 4 };
  const raw = serializeProgressBackup(progress, '2026-09-18T00:00:00.000Z');
  const envelope = JSON.parse(raw);

  assert.equal(envelope.format, BACKUP_FORMAT);
  assert.equal(envelope.version, BACKUP_VERSION);
  assert.equal(envelope.exportedAt, '2026-09-18T00:00:00.000Z');
  assert.equal(typeof envelope.checksum, 'string');
  assert.deepEqual(parseProgressBackup(raw), {
    ok: true,
    progress,
    exportedAt: envelope.exportedAt,
    version: BACKUP_VERSION,
  });
});

test('backup parser rejects malformed, unsupported, and tampered clipboard data', () => {
  assert.deepEqual(parseProgressBackup(''), { ok: false, error: 'empty' });
  assert.deepEqual(parseProgressBackup('{bad'), { ok: false, error: 'invalid_json' });
  assert.deepEqual(parseProgressBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 99 })), { ok: false, error: 'unsupported_version' });

  const raw = serializeProgressBackup({ stars: 1 }, '2026-09-18T00:00:00.000Z');
  const tampered = JSON.parse(raw);
  tampered.progress.stars = 99;
  assert.deepEqual(parseProgressBackup(JSON.stringify(tampered)), { ok: false, error: 'checksum_mismatch' });
});

test('backup envelope checksum is independent of progress key order', () => {
  const first = createBackupEnvelope({ stars: 1, grade: 4 }, '2026-09-18');
  const second = createBackupEnvelope({ grade: 4, stars: 1 }, '2026-09-18');
  assert.equal(first.checksum, second.checksum);
});
