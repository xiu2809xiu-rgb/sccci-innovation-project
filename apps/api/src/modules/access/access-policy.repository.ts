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

  /** The ACTIVE entries of the cross-border transfer register, which area 4 administers. */
  activeTransfers() {
    return this.prisma.crossBorderTransfer.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        fromEntityCode: true,
        toEntityCode: true,
        dataCategories: true,
        version: true,
      },
      orderBy: { id: 'asc' },
    });
  }
}
