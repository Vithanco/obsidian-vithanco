// @ts-ignore - resolved via allowJs; types in ../../website/Package/index.d.ts
import { init } from '../../website/Package/index.js';
import type { Exports } from '../../website/Package/bridge-js.js';

export type RenderVGL = (vgl: string, darkMode?: boolean) => Promise<string>;
// @ts-ignore - esbuild's binary loader turns this into a Uint8Array
import wasmBinary from '../VGraphWasm.wasm';

export async function initVithanco(): Promise<RenderVGL> {
    // The WASM binary is embedded at build time (esbuild binary loader),
    // so init() never executes the import.meta.url fetch in Package/index.js.
    const { exports }: { exports: Exports } = await init({
        module: wasmBinary,
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
