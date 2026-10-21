import { Injectable } from '@nestjs/common';
import {
  classificationLevelSchema,
  entityCodeSchema,
  fieldsCoveredBy,
  retentionActionSchema,
  transferStatusSchema,
  type ClassificationEntry,
  type GovernanceListQuery,
  type RetentionPolicy,
  type TransferEntry,
} from '@huitong/shared';

import type { Page } from '../../common/http/page.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

const skip = ({ page, pageSize }: GovernanceListQuery) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

/**
 * Area 4's registers as stored: the data classification, the cross-border
 * transfer register and the retention settings. Real data, read here; the
 * writes (each audited, and a register change reloading the access policy)
 * are area 4's to build.
 */
@Injectable()
export class GovernanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async classifications(query: GovernanceListQuery): Promise<Page<ClassificationEntry>> {
    const [rows, total] = await Promise.all([
      this.prisma.dataClassification.findMany({
        orderBy: [{ entityType: 'asc' }, { field: 'asc' }],
        ...skip(query),
      }),
      this.prisma.dataClassification.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        entityType: row.entityType,
        field: row.field,
        level: classificationLevelSchema.parse(row.level),
        description: row.description,
        descriptionZh: row.descriptionZh,
        isPersonalData: row.isPersonalData,
        isSensitive: row.isSensitive,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async transfers(query: GovernanceListQuery): Promise<Page<TransferEntry>> {
    const [rows, total] = await Promise.all([
      this.prisma.crossBorderTransfer.findMany({
        orderBy: [{ fromEntityCode: 'asc' }, { toEntityCode: 'asc' }, { name: 'asc' }],
        ...skip(query),
      }),
      this.prisma.crossBorderTransfer.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        nameZh: row.nameZh,
        fromEntityCode: entityCodeSchema.parse(row.fromEntityCode),
        toEntityCode: entityCodeSchema.parse(row.toEntityCode),
        fromCountry: row.fromCountry,
        toCountry: row.toCountry,
        dataCategories: row.dataCategories,
        // The same expansion the access policy enforces, so the register shows what it really shares.
        fieldsCovered: [...fieldsCoveredBy(row.dataCategories)].sort((a, b) => a.localeCompare(b)),
        purpose: row.purpose,
        legalBasis: row.legalBasis,
        mechanism: row.mechanism,
        status: transferStatusSchema.parse(row.status),
        version: row.version,
        approvedAt: row.approvedAt?.toISOString() ?? null,
        reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
        notes: row.notes,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async retention(query: GovernanceListQuery): Promise<Page<RetentionPolicy>> {
    const [rows, total] = await Promise.all([
      this.prisma.retentionPolicy.findMany({
        orderBy: [{ dataCategory: 'asc' }, { entityCode: 'asc' }],
        ...skip(query),
      }),
      this.prisma.retentionPolicy.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        dataCategory: row.dataCategory,
        entityCode: row.entityCode === null ? null : entityCodeSchema.parse(row.entityCode),
        retentionMonths: row.retentionMonths,
        action: retentionActionSchema.parse(row.action),
        legalReference: row.legalReference,
        lastAppliedAt: row.lastAppliedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
    };
  }
}
