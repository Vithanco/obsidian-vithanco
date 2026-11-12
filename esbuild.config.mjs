import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv[2] === 'production';

// The engine (wasm + its JS glue) is committed, because Obsidian's directory builds
// this repo on its own. Inside the VGraph monorepo the copies are refreshed from
// the engine just built, so they cannot drift from it there.
const enginePackage = path.join(__dirname, '../website/Package');
const vendored = path.join(__dirname, 'vendor/Package');
const wasmDst = path.join(__dirname, 'VGraphWasm.wasm');
if (fs.existsSync(enginePackage)) {
    fs.copyFileSync(path.join(enginePackage, 'VGraphWasm.wasm'), wasmDst);
    // Only the glue the plugin imports: its declarations live in src/engine.d.ts,
    // and src/vgraph-loader.ts sets WASI up instead of the generated platform code.
    for (const file of ['instantiate.js', 'runtime.js', 'bridge-js.js']) {
        fs.copyFileSync(path.join(enginePackage, file), path.join(vendored, file));
    }
    console.log('Refreshed VGraphWasm.wasm and vendor/Package from ../website/Package/');
}

// A production bundle embeds the WASM as base64, so a debug engine (90 MB) became
// a 115 MB main.js in 1.0.9. Stripped release builds carry no DWARF sections.
if (isProd) {
    const wasm = fs.readFileSync(wasmDst);
    if (wasm.length > 20_000_000 || wasm.includes('.debug_info')) {
        console.error(`Refusing to bundle ${wasm.length} bytes of unoptimized VGraphWasm.wasm. Build it with 'just release' first.`);
        process.exit(1);
    }
}

// Obsidian Sync's Standard plan will not sync a file over 5 MB, and main.js carries
// the engine. Gzipped it fits; src/vgraph-loader.ts unpacks it on load.
const gzippedWasm = {
    name: 'gzipped-wasm',
    setup(build) {
        build.onLoad({ filter: /\.wasm$/ }, (args) => ({
            contents: gzipSync(fs.readFileSync(args.path), { level: 9 }),
            loader: 'binary',
        }));
    },
};

const context = await esbuild.context({
    entryPoints: ['src/main.ts'],
    bundle: true,
    // Obsidian + Electron built-ins are provided at runtime; don't bundle them.
    external: [
        'obsidian',
        'electron',
        '@codemirror/*',
        '@lezer/*',
        'node:*',
    ],
    format: 'cjs',
    platform: 'browser',
    target: 'es2020',
    // Obsidian's installer only downloads main.js + manifest.json + styles.css,
    // so the WASM has to live in main.js.
    plugins: [gzippedWasm],
    alias: { 'vgraph-engine': './vendor/Package/instantiate.js' },
    logLevel: 'info',
    sourcemap: isProd ? false : 'inline',
    treeShaking: true,
    outfile: 'main.js',
});

if (isProd) {
    await context.rebuild();
    await context.dispose();
    console.log('Build complete.');
} else {
    await context.watch();
    console.log('Watching for changes...');
}
