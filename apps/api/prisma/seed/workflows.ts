import { MANPOWER_TO_ONBOARDING } from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * The manpower-request-to-onboarding workflow definition (area 2 builds the
 * state machine that runs it). The definition lives in @huitong/shared, so
 * the API's sample data and the seed cannot drift apart.
 */
export async function seedWorkflows(prisma: PrismaClient): Promise<string> {
  const { key, version, ...rest } = MANPOWER_TO_ONBOARDING;
  await prisma.workflowDefinition.upsert({
    where: { key_version: { key, version } },
    create: { key, version, ...rest },
    update: rest,
  });
  return `1 workflow definition (${String(MANPOWER_TO_ONBOARDING.steps.length)} steps)`;
}
