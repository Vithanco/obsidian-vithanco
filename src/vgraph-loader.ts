import { ConsoleStdout, File, OpenFile, PreopenDirectory, WASI } from '@bjorn3/browser_wasi_shim';
import { instantiate, MODULE_PATH, type WASI as EngineWASI } from 'vgraph-engine';
import gzippedWasm from '../VGraphWasm.wasm';

export type RenderVGL = (vgl: string, darkMode?: boolean) => Promise<string>;

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
}

// The engine writes its debug output and Graphviz's warnings to stdout and stderr.
// None of it is for the user, and Obsidian asks plugins not to log, so both are
// discarded; a real failure still arrives as an exception or an error in the SVG.
function quietWasi(): EngineWASI {
    const discard = (): void => undefined;
    const wasi = new WASI([MODULE_PATH], [], [
        new OpenFile(new File([])),
        ConsoleStdout.lineBuffered(discard),
        ConsoleStdout.lineBuffered(discard),
        new PreopenDirectory('/', new Map()),
    ], { debug: false });
    type ShimInstance = typeof wasi.inst;
    return {
        wasiImport: wasi.wasiImport,
        initialize: (instance) => wasi.initialize(instance as unknown as ShimInstance),
        setInstance: (instance) => {
            wasi.inst = instance as unknown as ShimInstance;
        },
    };
}

export async function initVithanco(): Promise<RenderVGL> {
    if (typeof WebAssembly === 'undefined') {
        throw new Error('WebAssembly is turned off on this device (on iPhone and iPad, Lockdown Mode does this).');
    }
    if (typeof DecompressionStream === 'undefined') {
        throw new Error('it needs iOS or iPadOS 16.4 or newer.');
    }
    const { exports } = await instantiate({
        module: await gunzip(gzippedWasm),
        getImports: () => ({}),
        wasi: quietWasi(),
    });

    // BEGIN SHARED CORE (keep in lockstep with vscode-vithanco/src/renderer.ts — `just parity`)
    return (vgl: string, darkMode = false): Promise<string> => {
        // Graphviz runs in-process inside the WASM module (swiftGraphviz), so this
        // is one synchronous call. It used to be a round trip — VGL→DOT in Swift,
        // DOT→layout JSON in a JS Graphviz, then VGL+layout→SVG in Swift — and the
        // two functions that took the layout back were removed in the engine when
        // that stopped being necessary. `just plugin-api` now catches that class of
        // drift, since the plugins are separate repos and do not notice.
        const result = darkMode ? exports.renderGraphDark(vgl) : exports.renderGraph(vgl);

        // Errors come back embedded as SVG text elements; surface them.
        if (result.includes('Error:') && result.includes('<text')) {
            const match = result.match(/Error:([^<]+)/);
            throw new Error(match ? match[1].trim() : 'Rendering failed');
        }
        return Promise.resolve(result);
    };
    // END SHARED CORE
}
