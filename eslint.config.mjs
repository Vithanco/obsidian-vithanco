import tsparser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import obsidianmd from 'eslint-plugin-obsidianmd';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    ...obsidianmd.configs.recommended,
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: './tsconfig.json' },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            'obsidianmd/ui/sentence-case': [
                'warn',
                {
                    brands: ['GitHub', 'Vithanco', 'Obsidian'],
                },
            ],
        },
    },
    {
        ignores: ['main.js', 'main.js.map', 'node_modules/**', 'vendor/**'],
    },
]);
