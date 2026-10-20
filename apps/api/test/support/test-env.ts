/** Integration tests use their own database and Redis DB so they never touch development data. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://huitong:huitong_local_only@localhost:5432/huitong_test';

export const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';
