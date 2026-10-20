import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Reads the stored role-permission matrix and clearance rules. */
@Injectable()
export class AccessPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  rolePermissions() {
    return this.prisma.rolePermission.findMany({ select: { role: true, permission: true } });
  }

  clearanceRules() {
    return this.prisma.clearanceRule.findMany({
      select: { role: true, entityCode: true, maxLevel: true, deniedReason: true },
    });
  }
}
