import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'set-version.mjs');

function pluginAt(version) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-version-'));
    const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
    write('manifest.json', { id: 'vithanco', version, minAppVersion: '1.5.0' });
    write('package.json', { name: 'obsidian-vithanco', version });
    write('versions.json', { [version]: '1.4.0' });
    return dir;
}
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const setVersion = (dir, version) =>
    execFileSync('node', [script, version], { cwd: dir, stdio: 'pipe' });

test('a new version reaches every file Obsidian reads, with the minimum app it needs', () => {
    const dir = pluginAt('1.0.0');
    setVersion(dir, '1.2.3');
    assert.equal(read(dir, 'manifest.json').version, '1.2.3');
    assert.equal(read(dir, 'package.json').version, '1.2.3');
    assert.deepEqual(read(dir, 'versions.json'), { '1.0.0': '1.4.0', '1.2.3': '1.5.0' });
});

test('a v-prefixed version is refused, because Obsidian rejects it, and nothing changes', () => {
    const dir = pluginAt('1.0.0');
    assert.throws(() => setVersion(dir, 'v1.2.3'));
    assert.equal(read(dir, 'manifest.json').version, '1.0.0');
});

for (const version of ['01.2.3', '1.02.3', '1.2.03']) {
    test(`${version} is refused, because a leading zero is not semver, and nothing changes`, () => {
        const dir = pluginAt('1.0.0');
        assert.throws(() => setVersion(dir, version));
        assert.equal(read(dir, 'manifest.json').version, '1.0.0');
    });
}

test('zero is still a valid version part', () => {
    const dir = pluginAt('1.0.0');
    setVersion(dir, '0.10.0');
    assert.equal(read(dir, 'manifest.json').version, '0.10.0');
});
