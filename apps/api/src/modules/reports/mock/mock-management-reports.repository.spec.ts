import { managementReportSchema } from '@huitong/shared';

import { MOCK_MANAGEMENT_REPORTS } from './management-report-mock-data.js';
import { MockManagementReportsRepository } from './mock-management-reports.repository.js';

describe('MockManagementReportsRepository', () => {
  it('serves each month in the shared contract, every figure with its sources', async () => {
    const repository = new MockManagementReportsRepository();
    for (const { period } of MOCK_MANAGEMENT_REPORTS) {
      const report = managementReportSchema.parse(await repository.forPeriod(period));
      for (const entity of report.entities) {
        expect(entity.headcount.sources.length).toBeGreaterThan(0);
        expect(entity.leaveDays.every((item) => item.sources.length > 0)).toBe(true);
      }
    }
  });

  it('has no report for a month that has none', async () => {
    expect(await new MockManagementReportsRepository().forPeriod('2026-10')).toBeNull();
  });
});
