import { Notice, Plugin } from 'obsidian';
import { initVithanco } from './vgraph-loader';

export default class VithancoPlugin extends Plugin {
    private renderVGL: ((vgl: string) => string) | null = null;
    private initPromise: Promise<void> | null = null;

    async onload() {
        this.initPromise = this.initializeRenderer();

        this.registerMarkdownCodeBlockProcessor('vgl', async (source, el) => {
            await this.initPromise;

            if (!this.renderVGL) {
                el.createEl('pre', {
                    text: 'Vithanco plugin failed to initialize. Check the developer console.',
                    cls: 'vithanco-error',
                });
                return;
            }

            try {
                const svg = this.renderVGL(source.trim());
                el.innerHTML = svg;
                el.addClass('vithanco-container');
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                el.createEl('pre', {
                    text: `Vithanco error: ${msg}`,
                    cls: 'vithanco-error',
                });
            }
        });
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
