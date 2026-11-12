import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'release-matches-build.mjs');

// A built tree and a released one, each holding main.js and styles.css.
function given(built, released) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-matches-build-'));
    for (const [dir, files] of [['built', built], ['released', released]]) {
        fs.mkdirSync(path.join(root, dir));
        for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(root, dir, name), body);
    }
    return root;
}
const check = (root) => spawnSync('node', [script, path.join(root, 'released'), 'main.js', 'styles.css'],
    { cwd: path.join(root, 'built'), encoding: 'utf8' });

// The attestation is made over our own build; it only covers the released files
// if they are the same bytes.
test('a release identical to the build passes', () => {
    const files = { 'main.js': 'bundle', 'styles.css': 'css' };
    assert.equal(check(given(files, files)).status, 0);
});

test('a release that differs from the build fails and names the file', () => {
    const r = check(given({ 'main.js': 'bundle', 'styles.css': 'css' }, { 'main.js': 'other', 'styles.css': 'css' }));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /main\.js/);
    assert.doesNotMatch(r.stderr, /styles\.css/);
});

test('a release missing a file fails and names it', () => {
    const r = check(given({ 'main.js': 'bundle', 'styles.css': 'css' }, { 'main.js': 'bundle' }));
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /styles\.css/);
});
