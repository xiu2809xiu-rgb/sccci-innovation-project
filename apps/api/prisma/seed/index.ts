import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { pino } from 'pino';

import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedAccessPolicy } from './access.js';
import { seedAttendanceLeave } from './attendance-leave.js';
import { seedConnectors } from './connectors.js';
import { seedGovernance } from './governance.js';
import { seedReferenceData } from './reference-data.js';
import { seedUsers } from './users.js';
import { seedWorkflows } from './workflows.js';

/**
 * Seeds the reference and baseline data every environment needs. Idempotent:
 * safe to run on every container start. The employee master is not seeded;
 * it fills through a real sync from the mock systems.
 */
const logger = pino({ name: 'seed', level: process.env.LOG_LEVEL ?? 'info' });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to seed');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const steps: [string, () => Promise<string>][] = [
    ['reference data', () => seedReferenceData(prisma)],
    ['access policy', () => seedAccessPolicy(prisma)],
    ['users', () => seedUsers(prisma)],
    ['connectors', () => seedConnectors(prisma, process.env)],
    ['governance', () => seedGovernance(prisma)],
    ['workflows', () => seedWorkflows(prisma)],
    ['attendance and leave', () => seedAttendanceLeave(prisma)],
  ];
  try {
    for (const [name, run] of steps) {
      logger.info({ step: name, result: await run() }, 'seeded');
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
