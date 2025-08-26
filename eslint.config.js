// Flat ESLint config for ESLint v9+
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // Migrate ignores from .eslintignore
  {
    ignores: ['dist', 'node_modules', 'coverage'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // In TS projects, TypeScript handles undefined symbols; disable to avoid DOM global noise
      'no-undef': 'off',
      // Allow intentional empty catch blocks in tiny try/catch guards
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];


