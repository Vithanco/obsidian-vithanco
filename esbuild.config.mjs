import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv[2] === 'production';

// Refresh the local VGraphWasm.wasm from the monorepo build output, when present.
// (In a standalone clone of the plugin repo, the committed WASM is used as-is.)
const wasmSrc = path.join(__dirname, '../website/Package/VGraphWasm.wasm');
const wasmDst = path.join(__dirname, 'VGraphWasm.wasm');
if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDst);
    console.log('Refreshed VGraphWasm.wasm from ../website/Package/');
}

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
    // Resolve npm packages from the plugin's own node_modules even when processing
    // files imported from ../website/Package/ (outside this tree).
    nodePaths: [path.join(__dirname, 'node_modules')],
    // Embed VGraphWasm.wasm directly into main.js as a Uint8Array constant.
    // This makes the plugin self-contained: Obsidian's marketplace installer only
    // downloads main.js + manifest.json + styles.css, so the WASM has to live in main.js.
    loader: {
        '.wasm': 'binary',
    },
    logLevel: 'info',
    // Silence warnings from BridgeJS-generated files in ../website/Package/:
    //   empty-import-meta — index.js uses import.meta.url for a fetch path we never hit
    //     (we pass `module: wasmBinary` directly, so the fetch branch is dead code).
    //   duplicate-object-key — generator emits two `getImports` keys in browser.js.
    // Both are upstream generator quirks; suppressing keeps the build output clean.
    logOverride: {
        'empty-import-meta': 'silent',
        'duplicate-object-key': 'silent',
    },
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
