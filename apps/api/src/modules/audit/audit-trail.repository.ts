import { Injectable } from '@nestjs/common';
import type { AuditEventQuery } from '@huitong/shared';

import type { Page } from '../../common/http/page.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

const EVENT_FIELDS = {
  id: true,
  occurredAt: true,
  actorUserId: true,
  actorRole: true,
  action: true,
  entityType: true,
  entityId: true,
  before: true,
  after: true,
  traceId: true,
} satisfies Prisma.AuditEventSelect;

export type AuditEventRow = Prisma.AuditEventGetPayload<{ select: typeof EVENT_FIELDS }>;

/** Reads the append-only audit log; AuditLogService is its only writer. */
@Injectable()
export class AuditTrailRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. Every filter has an index: entity, actor with time, action with time, and time. */
  async events(query: AuditEventQuery): Promise<Page<AuditEventRow>> {
    const where: Prisma.AuditEventWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lt: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: EVENT_FIELDS,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { items, total };
  }

  /** The entity of each employee number, for withholding other entities' employees. */
  async entitiesOf(employeeNos: readonly string[]): Promise<Map<string, string>> {
    if (employeeNos.length === 0) return new Map();
    const rows = await this.prisma.employee.findMany({
      where: { employeeNo: { in: [...employeeNos] } },
      select: { employeeNo: true, entityCode: true },
    });
    return new Map(rows.map((row) => [row.employeeNo, row.entityCode]));
  }

  async displayNames(userIds: readonly string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
    return new Map(rows.map((row) => [row.id, row.displayName]));
  }
}
