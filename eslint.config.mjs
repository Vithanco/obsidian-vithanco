import obsidianmd from 'eslint-plugin-obsidianmd';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    ...obsidianmd.configs.recommended,
    {
        files: ['src/**/*.ts'],
        // obsidianmd's recommended config registers @typescript-eslint and its
        // parser for .ts files; registering them again is an error since 0.5.
        languageOptions: {
            parserOptions: { project: './tsconfig.json' },
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
