// The part of the engine's generated glue (vendor/Package/instantiate.js) the
// plugin uses. It is declared here rather than vendored because Obsidian's review
// lints every .ts file in the repository, and the generated declarations fail its rules.

export interface Exports {
    renderGraph(vgl: string): string;
    renderGraphDark(vgl: string): string;
}

export interface WASI {
    wasiImport: WebAssembly.ModuleImports;
    initialize(instance: WebAssembly.Instance): void;
    setInstance(instance: WebAssembly.Instance): void;
}

export const MODULE_PATH: string;

export function instantiate(options: {
    module: WebAssembly.Module | ArrayBuffer | ArrayBufferView;
    getImports: () => Record<string, never>;
    wasi: WASI;
}): Promise<{ instance: WebAssembly.Instance; exports: Exports }>;
