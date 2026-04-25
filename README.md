# Vithanco for Obsidian

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

See the [VGL Guide](https://github.com/Vithanco/VGraph/blob/main/docs/VGL_GUIDE.md) for syntax.

## Installation

### From the Community Plugins browser (once approved)

1. Open Obsidian → Settings → Community Plugins → Browse
2. Search for **Vithanco**
3. Install and enable

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Vithanco/obsidian-vithanco/releases)
2. Copy them to `<your-vault>/.obsidian/plugins/obsidian-vithanco/`
3. Reload Obsidian and enable the plugin

## Requirements

- Obsidian 1.4.0 or newer
- Desktop only (mobile support planned)
- Internet on first launch (Graphviz layout engine is loaded from a CDN; cached afterwards)

## How it works

The Vithanco rendering engine is compiled from Swift to WebAssembly and embedded in the plugin. When you open a note containing a `vgl` code block, the plugin:

1. Parses the VGL source
2. Computes layout via Graphviz (loaded once from jsDelivr)
3. Produces a styled SVG
4. Injects it into the rendered Markdown

## Support

If you find this useful, [buy me a coffee](https://ko-fi.com/vithanco). The plugin will always be free and open source.

## Links

- VGraph monorepo (Swift source, MCP server, CLI): https://github.com/Vithanco/VGraph
- Vithanco website: https://vithanco.com
- Issues: https://github.com/Vithanco/obsidian-vithanco/issues

## License

MIT — see [LICENSE](LICENSE).
