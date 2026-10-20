import { execFileSync } from 'node:child_process';
import path from 'node:path';

import pg from 'pg';

import { TEST_DATABASE_URL } from './test-env.js';

const API_ROOT = path.resolve(import.meta.dirname, '../..');

/** Creates the test database if needed, then applies every migration and the seed to it. */
export default async function setup(): Promise<void> {
  const target = new URL(TEST_DATABASE_URL);
  const database = target.pathname.slice(1);
  if (!/^[a-z_][a-z0-9_]*$/.test(database)) {
    throw new Error(`Refusing unusual test database name "${database}"`);
  }
  const maintenance = new URL(TEST_DATABASE_URL);
  maintenance.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: maintenance.toString() });
  await admin.connect();
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await admin.end();
  }

  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, LOG_LEVEL: 'warn' };
  const run = (args: string[]) =>
    execFileSync(process.execPath, args, { cwd: API_ROOT, env, stdio: 'inherit' });
  run([path.join(API_ROOT, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy']);
  run(['--import', 'tsx', 'prisma/seed/index.ts']);
}
