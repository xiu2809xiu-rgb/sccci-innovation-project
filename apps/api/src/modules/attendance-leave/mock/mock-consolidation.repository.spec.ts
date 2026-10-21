import {
  COMPANY_MONTHLY_TEMPLATE,
  consolidationExceptionSchema,
  consolidationRunSummarySchema,
  templatePreviewRowSchema,
} from '@huitong/shared';

import { MockConsolidationRepository } from './mock-consolidation.repository.js';
import { MOCK_PREVIEW_ROWS, MOCK_RUNS } from './consolidation-mock-data.js';

const repository = new MockConsolidationRepository();
const columnKeys = COMPANY_MONTHLY_TEMPLATE.columns.map((column) => column.key);

describe('MockConsolidationRepository', () => {
  it('serves every run and exception in the shared contract', async () => {
    const { items } = await repository.runs({ page: 1, pageSize: 25 });
    expect(items).toHaveLength(MOCK_RUNS.length);
    for (const summary of items) {
      consolidationRunSummarySchema.parse(summary);
      const run = await repository.run(summary.id);
      for (const exception of run?.exceptions ?? []) consolidationExceptionSchema.parse(exception);
    }
  });

  it('keeps the counts consistent with the exceptions', () => {
    for (const run of MOCK_RUNS) {
      expect(run.exceptions).toHaveLength(run.exceptionCount);
      expect(run.exceptions.filter((item) => !item.resolved)).toHaveLength(run.openExceptionCount);
      const fromSources = run.sources.reduce(
        (sum, source) => sum + source.attendanceRows + source.leaveRecords,
        0,
      );
      expect(fromSources).toBe(run.recordCount);
    }
  });

  it('fills only the columns of the seeded company template', () => {
    for (const rows of Object.values(MOCK_PREVIEW_ROWS)) {
      for (const row of rows) {
        templatePreviewRowSchema.parse(row);
        expect(columnKeys).toEqual(expect.arrayContaining(Object.keys(row.values)));
      }
    }
  });

  it('filters runs by status and pages them', async () => {
    const failed = await repository.runs({ page: 1, pageSize: 25, status: 'FAILED' });
    expect(failed.items.map((run) => run.period)).toEqual(['2026-09']);
    const firstPage = await repository.runs({ page: 1, pageSize: 2 });
    expect(firstPage).toMatchObject({ total: MOCK_RUNS.length });
    expect(firstPage.items).toHaveLength(2);
  });

  it('has no rows for a month that was not consolidated, and no unknown runs', async () => {
    expect(await repository.previewRows('2026-10')).toEqual([]);
    expect(await repository.run('missing')).toBeNull();
  });
});
