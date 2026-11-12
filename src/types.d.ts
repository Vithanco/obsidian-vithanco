declare module '*.wasm' {
    const content: Uint8Array<ArrayBuffer>;
    export default content;
}
