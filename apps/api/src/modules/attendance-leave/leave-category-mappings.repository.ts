import { Injectable } from '@nestjs/common';
import {
  leaveCategorySchema,
  mappingRuleStatusSchema,
  type LeaveCategoryMapping,
  type LeaveCategoryMappingListQuery,
} from '@huitong/shared';

import type { Page } from '../../common/http/page.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/**
 * The leave-category rules as seeded and approved: real data, read through the
 * unique (connector, source category, version) index. Area 3 adds the writes:
 * a proposed change, its approval and its audit event.
 */
@Injectable()
export class LeaveCategoryMappingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LeaveCategoryMappingListQuery): Promise<Page<LeaveCategoryMapping>> {
    const where = query.connectorId ? { connectorId: query.connectorId } : {};
    const [rows, total] = await Promise.all([
      this.prisma.leaveCategoryMapping.findMany({
        where,
        orderBy: [{ connectorId: 'asc' }, { sourceCategory: 'asc' }, { version: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveCategoryMapping.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        connectorId: row.connectorId,
        sourceCategory: row.sourceCategory,
        sourceLabel: row.sourceLabel,
        canonicalCategory: leaveCategorySchema.parse(row.canonicalCategory),
        templateColumn: row.templateColumn,
        status: mappingRuleStatusSchema.parse(row.status),
        version: row.version,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
    };
  }
}
