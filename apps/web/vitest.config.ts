import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      // Page tests load lazy route chunks and type like a user; 5 s is too tight under parallel load.
      testTimeout: 15_000,
      // Stylesheets are skipped in tests, except the tokens file the contrast test reads as text.
      css: { include: [/tokens\.css/] },
    },
  }),
);
