# Vithanco for Obsidian

[![Sponsor](https://img.shields.io/github/sponsors/Vithanco?label=Sponsor&logo=GitHub&color=ea4aaa)](https://github.com/sponsors/Vithanco)

Render **Vithanco diagrams** directly inside your notes — IBIS, Concept Maps, Decision Trees, Goal Trees, Causal Loop Diagrams, and more — using a simple `vgl` code block.

> **Vithanco** = **Vi**sual **Th**inking **an**d **Co**mmunication. **VGL** (Vithanco Graph Language) is a compact text format for these diagrams.

## Example

````markdown
```vgl
vgraph decision: IBIS "Should we ship the plugin?" {
  node q1: Question "Should we ship?";
  node a1: Answer "Yes, soon";
  node p1: Pro "Users have asked for it";
  node c1: Con "Docs are still thin";
  edge q1 -> a1;
  edge a1 -> p1;
  edge a1 -> c1;
}
```
````

The block is replaced with a rendered SVG in reading view.

## Supported notations

IBIS, BBS, Impact Mapping, Concept Map, Current Reality Tree (CRT), Evaporating Cloud (EC), Future Reality Tree (FRT), Prerequisite Tree (PRT), Transition Tree (TRT), Attack-Defense Tree, Goal Tree, Causal Loop Diagram (CLD), Decision Tree, Timeline.

## Learn the language

- **[VGL Syntax Guide](https://vithanco.com/tools/VGL_GUIDE/index.html)** — full reference for the language
- **[Notations Gallery](https://vithanco.com)** — examples and use cases for every supported notation

You can also open these from inside Obsidian: open the command palette and search for *Vithanco: Open VGL syntax guide* or *Vithanco: Insert IBIS example*. There's a settings tab with the same links under **Settings → Community Plugins → Vithanco**.

## Installation

### From the Community Plugins browser (once approved)

1. Open Obsidian → Settings → Community Plugins → Browse
2. Search for **Vithanco**
3. Install and enable

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Vithanco/obsidian-vithanco/releases)
2. Copy them to `<your-vault>/.obsidian/plugins/vithanco/`
3. Reload Obsidian and enable the plugin

## Requirements

- Obsidian 1.4.0 or newer
- Desktop only (mobile support planned)
- No internet connection required — everything, including the Graphviz layout engine, is compiled into the bundled WebAssembly module. The plugin makes no network calls and does not read or write files outside your vault.

## How it works

The Vithanco rendering engine is compiled from Swift to WebAssembly and embedded in the plugin. When you open a note containing a `vgl` code block, the plugin:

1. Parses the VGL source
2. Computes layout via Graphviz, running in-process inside the same WebAssembly module
3. Produces a styled SVG
4. Injects it into the rendered Markdown

## Support

If you find this useful, please consider [sponsoring on GitHub](https://github.com/sponsors/Vithanco). The plugin will always be free and open source.

## Links

- Vithanco website (notations gallery): https://vithanco.com
- VGL syntax guide: https://vithanco.com/tools/VGL_GUIDE/index.html
- VGraph monorepo (Swift source, MCP server, CLI): https://github.com/Vithanco/VGraph
- Issues: https://github.com/Vithanco/obsidian-vithanco/issues

## Acknowledgements

- [Graphviz](https://graphviz.org/) (EPL-1.0) — layout engine, compiled into the WebAssembly module via [SwiftGraphviz](https://github.com/Vithanco/swiftGraphviz)
- [`@bjorn3/browser_wasi_shim`](https://github.com/bjorn3/browser_wasi_shim) (MIT/Apache-2.0) — bundled to run the Vithanco WebAssembly engine

## License

MIT — see [LICENSE](LICENSE).
