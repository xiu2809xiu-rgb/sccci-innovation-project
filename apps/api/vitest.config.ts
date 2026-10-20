import { defineConfig } from 'vitest/config';

/**
 * Two projects: fast unit tests that need nothing running, and integration
 * tests against a real PostgreSQL and Redis (the global setup migrates and
 * seeds an isolated `huitong_test` database). Integration files run one at a
 * time because they share that database.
 */
export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.int-spec.ts'],
          globalSetup: ['./test/support/global-setup.ts'],
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/generated/**'],
    },
  },
});
