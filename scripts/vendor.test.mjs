import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const vendored = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'Package');
const files = fs.readdirSync(vendored, { recursive: true }).map(String);

// Obsidian's review lints every TypeScript file in the repository, declarations
// included, and the generated ones fail its rules. src/engine.d.ts declares what
// the plugin uses instead.
test('the vendored engine glue carries no TypeScript declarations', () => {
    assert.deepEqual(files.filter((f) => f.endsWith('.ts')), []);
});

// The generated browser setup logs the engine's output to the console; the
// plugin sets WASI up itself in src/ and keeps it quiet.
test('the vendored engine glue carries no platform setup', () => {
    assert.deepEqual(files.filter((f) => f.startsWith('platforms') || f.startsWith('index.')), []);
});
