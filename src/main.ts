import {
    App,
    Editor,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
} from 'obsidian';
import { initVithanco } from './vgraph-loader';

// External documentation URLs surfaced via README, settings tab, command palette,
// and inline error messages so users always have a path to the syntax docs.
const URL_GUIDE = 'https://vithanco.com/tools/VGL_GUIDE/index.html';
const URL_GALLERY = 'https://vithanco.com';
const URL_SPONSOR = 'https://github.com/sponsors/Vithanco';

const IBIS_EXAMPLE = `\`\`\`vgl
vgraph decision: IBIS "Should we ship the plugin?" {
  node q1: Question "Should we ship?";
  node a1: Answer "Yes, soon";
  node p1: Pro "Users have asked for it";
  node c1: Con "Docs are still thin";
  edge q1 -> a1;
  edge a1 -> p1;
  edge a1 -> c1;
}
\`\`\`
`;

export default class VithancoPlugin extends Plugin {
    private renderVGL: ((vgl: string) => string) | null = null;
    private initPromise: Promise<void> | null = null;

    async onload() {
        this.initPromise = this.initializeRenderer();

        this.registerMarkdownCodeBlockProcessor('vgl', async (source, el) => {
            await this.initPromise;

            if (!this.renderVGL) {
                this.renderError(
                    el,
                    'Vithanco plugin failed to initialize. Check the developer console.',
                    false,
                );
                return;
            }

            try {
                const svg = this.renderVGL(source.trim());
                const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
                const svgEl = doc.documentElement;
                if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
                    this.renderError(el, 'Failed to parse rendered SVG.', false);
                    return;
                }
                el.empty();
                el.appendChild(svgEl);
                el.addClass('vithanco-container');
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.renderError(el, msg, true);
            }
        });

        this.addCommand({
            id: 'open-vgl-guide',
            name: 'Open VGL syntax guide',
            callback: () => window.open(URL_GUIDE),
        });

        this.addCommand({
            id: 'open-notations-gallery',
            name: 'Browse notations gallery',
            callback: () => window.open(URL_GALLERY),
        });

        this.addCommand({
            id: 'insert-ibis-example',
            name: 'Insert IBIS example',
            editorCallback: (editor: Editor) => {
                editor.replaceSelection(IBIS_EXAMPLE);
            },
        });

        this.addSettingTab(new VithancoSettingTab(this.app, this));
    }

    private renderError(el: HTMLElement, message: string, withSyntaxHelp: boolean): void {
        el.empty();
        el.addClass('vithanco-error-block');
        el.createEl('pre', { text: `Vithanco error: ${message}`, cls: 'vithanco-error' });
        if (withSyntaxHelp) {
            const help = el.createEl('p', { cls: 'vithanco-error-help' });
            help.appendText('See the ');
            help.createEl('a', { text: 'VGL syntax guide', href: URL_GUIDE });
            help.appendText(' for help.');
        }
    }

    private async initializeRenderer(): Promise<void> {
        try {
            this.renderVGL = await initVithanco();
        } catch (err) {
            console.error('[Vithanco] Initialization failed:', err);
            new Notice('Vithanco plugin failed to initialize. See console for details.');
        }
    }

    onunload() {
        this.renderVGL = null;
    }
}

class VithancoSettingTab extends PluginSettingTab {
    private plugin: VithancoPlugin;

    constructor(app: App, plugin: VithancoPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('p', {
            text: 'Render VGL (Vithanco Graph Language) diagrams in your notes by writing a `vgl` code block. The block is replaced with a rendered SVG in reading view.',
        });

        new Setting(containerEl).setName('Documentation').setHeading();

        new Setting(containerEl)
            .setName('VGL syntax guide')
            .setDesc('Full reference for the VGL language — node types, edge types, attributes, examples.')
            .addButton((btn) =>
                btn
                    .setButtonText('Open guide')
                    .setCta()
                    .onClick(() => window.open(URL_GUIDE)),
            );

        new Setting(containerEl)
            .setName('Notations gallery')
            .setDesc('Browse all supported notations (IBIS, CLD, Concept Maps, Timelines, …) with examples and use cases.')
            .addButton((btn) =>
                btn.setButtonText('Browse').onClick(() => window.open(URL_GALLERY)),
            );

        new Setting(containerEl).setName('Support').setHeading();

        new Setting(containerEl)
            .setName('Sponsor on GitHub')
            .setDesc('Support continued development. The plugin will always be free and open source.')
            .addButton((btn) =>
                btn
                    .setButtonText('Sponsor')
                    .setCta()
                    .onClick(() => window.open(URL_SPONSOR)),
            );
    }
}
