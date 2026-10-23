import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '@huitong/shared';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** The `connectors` table: what each system is, its non-secret settings and its last health check. */
@Injectable()
export class ConnectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.connector.findMany({ orderBy: [{ region: 'desc' }, { id: 'asc' }] });
  }

  findById(id: string) {
    return this.prisma.connector.findUnique({ where: { id } });
  }

  async recordHealth(id: string, status: HealthStatus, checkedAt: Date): Promise<void> {
    await this.prisma.connector.update({
      where: { id },
      data: { lastHealthStatus: status, lastHealthCheckAt: checkedAt },
    });
  }

  /** Makes a draft connector active; false when it was not a draft. */
  async activateDraft(id: string): Promise<boolean> {
    const { count } = await this.prisma.connector.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'ACTIVE' },
    });
    return count > 0;
  }

  displayNames(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
  }
}
