// The version lives in three files Obsidian and npm read; versions.json also maps
// it to the minimum app it needs. Shared by release.sh and the bump PR in CI.
import fs from 'node:fs';

const version = process.argv[2];
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '')) {
    console.error(`Version must be plain semver such as 1.2.3 (Obsidian rejects a leading v), got '${version}'`);
    process.exit(1);
}

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

const manifest = read('manifest.json');
write('manifest.json', { ...manifest, version });
write('package.json', { ...read('package.json'), version });
write('versions.json', { ...read('versions.json'), [version]: manifest.minAppVersion });
