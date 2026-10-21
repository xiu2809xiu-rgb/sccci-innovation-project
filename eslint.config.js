import {
  browser,
  javascript,
  nest,
  node,
  prettier,
  react,
  typescript,
} from '@huitong/eslint-config';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/src/generated/',
    '**/test-results/',
    '**/playwright-report/',
    'docs/slides/dist/',
  ]),
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  typescript,
  javascript,
  { files: ['apps/web/**/*.{ts,tsx}'], extends: [react] },
  {
    // Generated shadcn primitives export their cva variants next to the component.
    files: ['apps/web/src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  { files: ['apps/web/public/**/*.js'], extends: [browser] },
  { files: ['apps/api/**/*.ts'], extends: [nest] },
  {
    files: [
      'services/**/*.ts',
      'packages/**/*.{ts,js}',
      'scripts/**/*.mjs',
      'apps/*/scripts/**/*.mjs',
      'assets-src/**/*.mjs',
      '*.js',
    ],
    extends: [node],
  },
  prettier,
]);
