import { Injectable } from '@nestjs/common';
import type { Role } from '@huitong/shared';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Audited, but too frequent or too routine for the overview's activity feed. */
const QUIET_ACTIONS = [
  'employee.created',
  'sync.run.requested',
  'sync.preview.completed',
  'connector.health-checked',
] as const;

/**
 * Read-only aggregate queries for the overview page. A read model across
 * areas: it only counts and lists, never writes, so it reads the tables
 * directly instead of going through each area's repository.
 */
@Injectable()
export class OverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  employeeCountsByEntity() {
    return this.prisma.employee.groupBy({ by: ['entityCode'], _count: { _all: true } });
  }

  /** Employees with at least one open conflict. */
  async conflictedEmployeeCount(): Promise<number> {
    const rows = await this.prisma.conflict.groupBy({
      by: ['employeeId'],
      where: { status: 'OPEN' },
    });
    return rows.length;
  }

  openConflictCount(): Promise<number> {
    return this.prisma.conflict.count({ where: { status: 'OPEN' } });
  }

  connectorsWithRecentRuns(runs: number) {
    return this.prisma.connector.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        nameZh: true,
        type: true,
        status: true,
        region: true,
        lastSyncAt: true,
        syncRuns: {
          orderBy: { queuedAt: 'desc' },
          take: runs,
          select: {
            id: true,
            status: true,
            trigger: true,
            queuedAt: true,
            finishedAt: true,
            conflictCount: true,
            errorCount: true,
          },
        },
      },
    });
  }

  pendingMappingProposalCount(): Promise<number> {
    return this.prisma.mappingProposal.count({ where: { status: 'PENDING_REVIEW' } });
  }

  pendingTransferCount(): Promise<number> {
    return this.prisma.crossBorderTransfer.count({ where: { status: 'PENDING_REVIEW' } });
  }

  openTaskCountFor(role: Role): Promise<number> {
    return this.prisma.workflowTask.count({
      where: { assigneeRole: role, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
  }

  recentOpenConflicts(take: number) {
    return this.prisma.conflict.findMany({
      where: { status: 'OPEN' },
      orderBy: { detectedAt: 'desc' },
      take,
      select: {
        id: true,
        field: true,
        detectedAt: true,
        employee: {
          select: { employeeNo: true, fullNameLatin: true, fullNameLocal: true, entityCode: true },
        },
      },
    });
  }

  /**
   * The activity feed: business events only. Sign-ins, per-record bulk loads and
   * routine operations stay in the audit log but would drown the feed.
   */
  recentBusinessEvents(take: number) {
    return this.prisma.auditEvent.findMany({
      where: {
        NOT: [{ action: { startsWith: 'auth.' } }, { action: { in: [...QUIET_ACTIONS] } }],
      },
      orderBy: { occurredAt: 'desc' },
      take,
      select: {
        id: true,
        occurredAt: true,
        action: true,
        actorUserId: true,
        actorRole: true,
        entityType: true,
        entityId: true,
      },
    });
  }

  displayNames(userIds: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true },
    });
  }
}
