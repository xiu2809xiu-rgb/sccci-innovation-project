import 'dotenv/config';

import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI settings (Prisma 7 reads the connection URL here, not from
 * schema.prisma). The URL is optional so `prisma generate` works in CI and
 * Docker builds without a database; commands that connect fail clearly
 * when it is missing.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --import tsx prisma/seed/index.ts',
  },
  ...(process.env.DATABASE_URL ? { datasource: { url: process.env.DATABASE_URL } } : {}),
});
