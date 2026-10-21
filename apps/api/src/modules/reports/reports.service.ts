import { Injectable } from '@nestjs/common';
import type { ManagementReport } from '@huitong/shared';

import { NotFoundError } from '../../common/errors/app-error.js';
import { ManagementReportsRepository } from './management-reports.repository.js';

/** Management reports (area 3): read-only, aggregates across the entities. */
@Injectable()
export class ReportsService {
  constructor(private readonly reports: ManagementReportsRepository) {}

  async management(period: string): Promise<ManagementReport> {
    const report = await this.reports.forPeriod(period);
    if (!report) throw new NotFoundError(`The management report for ${period}`);
    return report;
  }
}
