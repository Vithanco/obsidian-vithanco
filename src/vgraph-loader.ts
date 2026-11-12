import { init } from '../vendor/Package/index.js';
import type { Exports } from '../vendor/Package/bridge-js.js';
import gzippedWasm from '../VGraphWasm.wasm';

export type RenderVGL = (vgl: string, darkMode?: boolean) => Promise<string>;

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
}

export async function initVithanco(): Promise<RenderVGL> {
    const { exports }: { exports: Exports } = await init({
        module: await gunzip(gzippedWasm),
        getImports: () => ({}),
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
