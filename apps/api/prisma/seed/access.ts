import { DEFAULT_CLEARANCE_RULES, DEFAULT_ROLE_PERMISSIONS, ROLES } from '@huitong/shared';

import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Resets the role-permission matrix and clearance rules to the baseline in
 * `@huitong/shared` (area 4's administration screens change them later).
 */
export async function seedAccessPolicy(prisma: PrismaClient): Promise<string> {
  const permissions = ROLES.flatMap((role) =>
    DEFAULT_ROLE_PERMISSIONS[role].map((permission) => ({ role, permission })),
  );
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.rolePermission.createMany({ data: permissions }),
    prisma.clearanceRule.deleteMany(),
    prisma.clearanceRule.createMany({
      data: DEFAULT_CLEARANCE_RULES.map((rule) => ({
        role: rule.role,
        entityCode: rule.entityCode,
        maxLevel: rule.maxLevel,
        deniedReason: rule.deniedReason ?? null,
      })),
    }),
  ]);
  return `${String(permissions.length)} role permissions, ${String(DEFAULT_CLEARANCE_RULES.length)} clearance rules`;
}
