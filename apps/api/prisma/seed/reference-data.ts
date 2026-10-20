import { DEPARTMENTS, LEGAL_ENTITIES } from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';

/** Legal entities and canonical departments (synthetic; the client is anonymised as Organisation E). */
export async function seedReferenceData(prisma: PrismaClient): Promise<string> {
  for (const entity of LEGAL_ENTITIES) {
    await prisma.legalEntity.upsert({
      where: { code: entity.code },
      create: { ...entity, isActive: entity.code !== 'MY01' },
      update: {
        name: entity.name,
        nameZh: entity.nameZh,
        country: entity.country,
        currency: entity.currency,
        timezone: entity.timezone,
      },
    });
  }
  for (const department of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: department.code },
      create: department,
      update: { nameEn: department.nameEn, nameZh: department.nameZh },
    });
  }
  return `${String(LEGAL_ENTITIES.length)} entities, ${String(DEPARTMENTS.length)} departments`;
}
