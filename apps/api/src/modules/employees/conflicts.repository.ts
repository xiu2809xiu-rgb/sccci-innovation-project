import { Injectable } from '@nestjs/common';
import type { ConflictListQuery } from '@huitong/shared';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { VisibleScope } from '../access/field-masker.js';
import { jsonColumn } from './employees.repository.js';

type Tx = Prisma.TransactionClient;

const EMPLOYEE = {
  select: {
    id: true,
    employeeNo: true,
    fullNameLatin: true,
    fullNameLocal: true,
    entityCode: true,
  },
} as const;

/** Conflicts between sources, and HR's resolutions of them. */
@Injectable()
export class ConflictsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page of the queue: conflicts about employees of the entities the viewer may list, on the
   * fields it may see there. The scope is in the query, so the page and its total agree.
   */
  async list(query: ConflictListQuery, scopes: readonly VisibleScope[]) {
    const inScope = scopes.filter(
      (scope) => !query.entityCode || scope.entityCode === query.entityCode,
    );
    if (inScope.length === 0) return { items: [], total: 0 };
    const where: Prisma.ConflictWhereInput = {
      status: query.status,
      ...(query.field ? { field: query.field } : {}),
      OR: inScope.map((scope) => ({
        employee: { entityCode: scope.entityCode },
        ...(scope.hiddenFields.length > 0 ? { field: { notIn: scope.hiddenFields } } : {}),
      })),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.conflict.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { employee: EMPLOYEE },
      }),
      this.prisma.conflict.count({ where }),
    ]);
    return { items, total };
  }

  /** The conflict, its employee, and what each source holds for the field now. */
  findForResolution(id: string) {
    return this.prisma.conflict.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            provenance: true,
            sourceRecords: { select: { connectorId: true, payload: true } },
          },
        },
      },
    });
  }

  /** Marks an OPEN conflict resolved; false when someone resolved it first. */
  async resolve(
    tx: Tx,
    id: string,
    resolution: {
      resolution: 'SOURCE_SELECTED' | 'MANUAL_VALUE';
      chosenConnectorId: string | null;
      resolvedValue: unknown;
      resolutionNote: string | null;
      resolvedByUserId: string;
    },
  ): Promise<boolean> {
    const { count } = await tx.conflict.updateMany({
      where: { id, status: 'OPEN' },
      data: {
        ...resolution,
        resolvedValue: jsonColumn(resolution.resolvedValue),
        status: 'RESOLVED',
        openKey: null,
        resolvedAt: new Date(),
      },
    });
    return count === 1;
  }

  findById(id: string) {
    return this.prisma.conflict.findUnique({ where: { id }, include: { employee: EMPLOYEE } });
  }

  connectorNames(ids: readonly string[]) {
    return this.prisma.connector.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true, nameZh: true },
    });
  }

  displayNames(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
  }
}
