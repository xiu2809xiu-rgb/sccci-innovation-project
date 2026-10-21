import { Injectable } from '@nestjs/common';
import { reportTemplateColumnSchema, type ReportTemplate } from '@huitong/shared';
import { z } from 'zod';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

const columnsSchema = z.array(reportTemplateColumnSchema).min(1);

/** Reporting templates as stored: real data, the newest active version of each key. */
@Injectable()
export class ReportTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when no active version of the template exists. */
  async active(key: string): Promise<ReportTemplate | null> {
    const row = await this.prisma.reportTemplate.findFirst({
      where: { key, isActive: true },
      orderBy: { version: 'desc' },
    });
    if (!row) return null;
    return {
      key: row.key,
      version: row.version,
      name: row.name,
      nameZh: row.nameZh,
      // Stored as JSON, so it is validated on the way out like any external input.
      columns: columnsSchema.parse(row.columns),
    };
  }
}
