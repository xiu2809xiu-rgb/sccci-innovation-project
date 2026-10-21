import { Injectable } from '@nestjs/common';
import type { ManagementReport } from '@huitong/shared';

import { ManagementReportsRepository } from '../management-reports.repository.js';
import { MOCK_MANAGEMENT_REPORTS } from './management-report-mock-data.js';

/** Serves the typed sample in management-report-mock-data.ts; area 3's repository replaces it. */
@Injectable()
export class MockManagementReportsRepository extends ManagementReportsRepository {
  forPeriod(period: string): Promise<ManagementReport | null> {
    return Promise.resolve(
      MOCK_MANAGEMENT_REPORTS.find((report) => report.period === period) ?? null,
    );
  }
}
