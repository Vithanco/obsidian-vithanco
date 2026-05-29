// @ts-ignore - resolved via allowJs; types in ../../website/Package/index.d.ts
import { init } from '../../website/Package/index.js';
import type { Exports } from '../../website/Package/bridge-js.js';

export type RenderVGL = (vgl: string, darkMode?: boolean) => Promise<string>;
// @ts-ignore - esbuild's binary loader turns this into a Uint8Array
import wasmBinary from '../VGraphWasm.wasm';

type GraphvizModule = {
    load: () => Promise<{ layout: (dot: string, format: string, engine: string) => string }>;
    unload: () => void;
};

async function loadGraphviz(): Promise<GraphvizModule> {
    // Dynamic URL import — works in Electron's renderer without bundling the ~10 MB library.
    // @ts-ignore
    const { Graphviz } = await import('https://cdn.jsdelivr.net/npm/@hpcc-js/wasm-graphviz@1.21.5/dist/index.js');
    return Graphviz as GraphvizModule;
}

export async function initVithanco(): Promise<RenderVGL> {
    const Graphviz = await loadGraphviz();

    // The WASM binary is embedded at build time (esbuild binary loader),
    // so init() never executes the import.meta.url fetch in Package/index.js.
    const { exports }: { exports: Exports } = await init({
        module: wasmBinary,
        getImports: () => ({}),
    });

    // @hpcc-js/wasm-graphviz can poison its instance after an internal trap
    // ("table index is out of bounds"), so every layout runs on a FRESH
    // instance (unload + load), awaited at JS top level — never nested inside
    // a Swift→WASM frame. Mirrors website/dist/vgraph-v1.1.0.js.
    const layoutDotToJSON = async (dot: string): Promise<string> => {
        try { Graphviz.unload(); } catch (_) { /* already unloaded */ }
        const gv = await Graphviz.load();
        return gv.layout(dot, 'json', 'dot');
    };

    return async (vgl: string, darkMode = false): Promise<string> => {
        // Decoupled flow: VGL→DOT (Swift), DOT→layout JSON (Graphviz, JS top
        // level), VGL+layout→SVG (Swift). Graphviz never runs while a Swift
        // WASM frame is on the stack.
        const dot = exports.dotForLayout(vgl);
        if (dot.startsWith('Error:')) {
            throw new Error(dot.slice('Error:'.length).trim());
        }

        const layoutJSON = await layoutDotToJSON(dot);

        const result = darkMode
            ? exports.renderGraphWithLayoutDark(vgl, layoutJSON)
            : exports.renderGraphWithLayout(vgl, layoutJSON);

        // renderGraphWithLayout embeds errors as SVG text elements; surface them.
        if (result.includes('Error:') && result.includes('<text')) {
            const match = result.match(/Error:([^<]+)/);
            throw new Error(match ? match[1].trim() : 'Rendering failed');
        }
        return result;
    };
}
