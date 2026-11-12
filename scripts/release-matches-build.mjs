// Fails unless each named file in the current directory is byte-identical to the
// released copy. The attest workflow attests its own build, which covers the
// released assets only when they are the same bytes.
// Usage: node scripts/release-matches-build.mjs <released-dir> <file>...
import fs from 'node:fs';
import path from 'node:path';

const [releasedDir, ...files] = process.argv.slice(2);
let ok = true;
for (const file of files) {
    const released = path.join(releasedDir, file);
    if (!fs.existsSync(released)) {
        console.error(`${file}: not in the release`);
        ok = false;
    } else if (!fs.readFileSync(file).equals(fs.readFileSync(released))) {
        console.error(`${file}: the release differs from the build of this tag`);
        ok = false;
    }
}
process.exit(ok ? 0 : 1);
