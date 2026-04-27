import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/.svelte-kit/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vercel/**',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (applies to .ts and .tsx files)
  ...tseslint.configs.recommended,

  // Svelte recommended rules
  ...svelte.configs.recommended,

  // All TypeScript-bearing files (.ts, .tsx, .svelte)
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    rules: {
      // Allow _ prefixed unused vars (standard convention for intentionally unused)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // Downgrade to warn — any is common in tests and Fastify plugin types
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // TypeScript (non-Svelte) files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Svelte files configuration
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Downgrade to warn — Svelte template usage is sometimes missed by the parser
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // Downgrade to warn — many existing {#each} blocks lack keys; migration is gradual
      'svelte/require-each-key': 'warn',
      // Downgrade to warn — href links without resolve() are common in existing code
      'svelte/no-navigation-without-resolve': 'warn',
      // Downgrade to warn — URLSearchParams -> SvelteURLSearchParams migration is gradual
      'svelte/prefer-svelte-reactivity': 'warn',
      // Downgrade to warn — {@html} is used for JSON-LD structured data
      'svelte/no-at-html-tags': 'warn',
      // Downgrade to warn — unnecessary children snippets are a style concern, not a bug
      'svelte/no-useless-children-snippet': 'warn',
    },
  },

  // Prettier must be last to override conflicting rules
  prettier,
);