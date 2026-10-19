/**
 * Shared ESLint flat configuration for HuiTong (ESLint 10 + typescript-eslint).
 *
 * Each preset is an array of config objects. The root `eslint.config.js` scopes
 * them to folders with `files`, so one lint run covers the whole monorepo.
 */
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,tsx,mts,cts}'];
const JS_FILES = ['**/*.{js,mjs,cjs}'];
const TEST_FILES = [
  '**/*.{spec,test,int-spec}.{ts,tsx}',
  '**/test/**/*.{ts,tsx}',
  '**/e2e/**/*.{ts,tsx}',
];

/** Type-aware strict and stylistic rules for every TypeScript file. */
export const typescript = [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: TS_FILES,
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // NestJS modules are empty classes carrying a decorator.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];

/** Plain JavaScript (config files, tooling scripts): no type information available. */
export const javascript = [
  {
    files: JS_FILES,
    ...tseslint.configs.disableTypeChecked,
  },
];

/** Plain browser scripts served as static files. */
export const browser = [
  {
    languageOptions: { globals: globals.browser },
  },
];

/** Node.js services, packages and scripts. */
export const node = [
  {
    languageOptions: { globals: globals.node },
  },
];

/** NestJS API: Node rules plus decorator-friendly settings. */
export const nest = [
  ...node,
  {
    rules: {
      // Constructor parameter types must stay value imports for dependency injection.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];

/** React web app: hooks (including React Compiler rules), Fast Refresh and strict jsx-a11y. */
export const react = [
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  jsxA11y.flatConfigs.strict,
  {
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Async event handlers are fine in JSX attributes.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
];

/** Turns off rules that conflict with Prettier. Must be last. */
export const prettier = [prettierConfig];
