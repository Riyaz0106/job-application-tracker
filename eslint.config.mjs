// ESLint 9 "flat config". A single config at the repo root lints both
// workspaces. Named .mjs so it's always treated as ESM (the root
// package.json has no "type": "module"), letting us use import syntax.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Never lint build output or dependencies.
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
  },

  // Baseline recommended rules for all JS/TS files.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Treat a leading underscore as "intentionally unused", matching tsc's
  // noUnusedLocals/noUnusedParameters behavior (e.g. an unused `_opts` arg).
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Client code runs in the browser and uses React + JSX.
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Warn if a file exports things other than components (breaks Fast Refresh).
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Server code runs in Node.
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Config files (tailwind/postcss/vite/eslint) execute in Node too.
  {
    files: ['**/*.config.{js,cjs,mjs,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // MUST be last: disables ESLint rules that would fight Prettier's formatting.
  prettier,
);
