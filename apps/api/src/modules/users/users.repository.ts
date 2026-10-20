import { Injectable } from '@nestjs/common';
import type { Role } from '@huitong/shared';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

const PUBLIC_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  displayNameZh: true,
  role: true,
  homeEntityCode: true,
  employeeNo: true,
  locale: true,
  isActive: true,
  lastLoginAt: true,
} as const;

/** User accounts. The password hash is only ever selected for sign-in. */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForSignIn(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: PUBLIC_FIELDS });
  }

  /** The seeded demo account for a role (used only by the demo login). */
  findDemoUser(role: Role) {
    return this.prisma.user.findFirst({
      where: { role, isActive: true, email: { endsWith: '@orge.example' } },
      orderBy: { createdAt: 'asc' },
      select: PUBLIC_FIELDS,
    });
  }

  async recordSignIn(id: string, at: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: at } });
  }

  async list(page: number, pageSize: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: PUBLIC_FIELDS,
        orderBy: { email: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total };
  }
}
