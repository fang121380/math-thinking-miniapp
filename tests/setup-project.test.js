const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setupProject } = require('../scripts/setup-project');

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fan-math-setup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.copyFileSync(
    path.join(__dirname, '../project.config.example.json'),
    path.join(root, 'project.config.example.json'),
  );
  return root;
}

test('a fresh checkout can create a tourist configuration with the correct Mini Program root', (t) => {
  const root = workspace(t);
  assert.deepEqual(setupProject(root), { created: true });
  const config = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
  assert.equal(config.appid, 'touristappid');
  assert.equal(config.miniprogramRoot, 'miniprogram/');
  assert.equal(config.compileType, 'miniprogram');
});

test('repeated setup preserves the exact existing local configuration', (t) => {
  const root = workspace(t);
  const target = path.join(root, 'project.config.json');
  const existing = '{\n  "appid": "local-test-id", "setting": {"es6": false}\n}\n';
  fs.writeFileSync(target, existing);
  assert.deepEqual(setupProject(root), { created: false });
  assert.deepEqual(setupProject(root), { created: false });
  assert.equal(fs.readFileSync(target, 'utf8'), existing);
});

test('setup reports a missing template instead of silently claiming success', (t) => {
  const root = workspace(t);
  fs.unlinkSync(path.join(root, 'project.config.example.json'));
  assert.throws(() => setupProject(root), { code: 'ENOENT' });
  assert.equal(fs.existsSync(path.join(root, 'project.config.json')), false);
});
