// @ts-ignore - resolved via allowJs; types in ../../website/Package/index.d.ts
import { init } from '../../website/Package/index.js';
import type { Exports } from '../../website/Package/bridge-js.js';
// @ts-ignore - esbuild's binary loader turns this into a Uint8Array
import wasmBinary from '../VGraphWasm.wasm';

declare global {
    interface Window {
        graphvizLayout: (dot: string, engine?: string, format?: string) => string;
        graphvizLayoutJSON: (dot: string, engine?: string) => unknown;
    }
}

async function loadGraphviz(): Promise<void> {
    // Dynamic URL import — works in Electron's renderer without bundling the ~10 MB library.
    // @ts-ignore
    const { Graphviz } = await import('https://cdn.jsdelivr.net/npm/@hpcc-js/wasm@2.33.2/dist/graphviz.js');
    const graphviz = await Graphviz.load();

    window.graphvizLayout = (dot, engine = 'dot', format = 'svg') =>
        graphviz.layout(dot, format, engine);
    window.graphvizLayoutJSON = (dot, engine = 'dot') =>
        JSON.parse(graphviz.layout(dot, 'json', engine));
}

export async function initVithanco(): Promise<(vgl: string) => string> {
    await loadGraphviz();

    // The WASM binary is embedded at build time (esbuild binary loader),
    // so init() never executes the import.meta.url fetch in Package/index.js.
    const { exports }: { exports: Exports } = await init({
        module: wasmBinary as Uint8Array,
        getImports: () => ({}),
    });

    return (vgl: string): string => {
        const result = exports.renderGraph(vgl);
        // renderGraph embeds errors as SVG text elements; surface them as real errors.
        if (result.includes('Error:') && result.includes('<text')) {
            const match = result.match(/Error:([^<]+)/);
            throw new Error(match ? match[1].trim() : 'Rendering failed');
        }
        return result;
    };
}
