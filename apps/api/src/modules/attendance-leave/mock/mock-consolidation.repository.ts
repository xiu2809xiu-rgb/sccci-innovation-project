import { Injectable } from '@nestjs/common';
import type {
  ConsolidationRunListQuery,
  ConsolidationRunSummary,
  TemplatePreviewRow,
} from '@huitong/shared';

import type { Page } from '../../../common/http/page.js';
import {
  ConsolidationRepository,
  type ConsolidationRunRecord,
} from '../consolidation.repository.js';
import { MOCK_PREVIEW_ROWS, MOCK_RUNS } from './consolidation-mock-data.js';

/** Ids that share their run's UUID prefix, so a run's exceptions read as its own. */
function exceptionId(runId: string, n: number): string {
  return `${runId.slice(0, 24)}${n.toString(16).padStart(12, '0')}`;
}

const RECORDS: readonly ConsolidationRunRecord[] = MOCK_RUNS.map((run) => ({
  ...run,
  exceptions: run.exceptions.map((exception, index) => ({
    id: exceptionId(run.id, 0x100 + index),
    ...exception,
  })),
}));

function toSummary(record: ConsolidationRunRecord): ConsolidationRunSummary {
  const { sources, exceptions, ...summary } = record;
  return summary;
}

/**
 * Serves the typed sample in consolidation-mock-data.ts through the read-model
 * contract. Nothing is stored, so area 3's Prisma repository replaces this
 * class rather than extending it.
 */
@Injectable()
export class MockConsolidationRepository extends ConsolidationRepository {
  runs(query: ConsolidationRunListQuery): Promise<Page<ConsolidationRunSummary>> {
    const matching = RECORDS.filter((run) => !query.status || run.status === query.status);
    const start = (query.page - 1) * query.pageSize;
    return Promise.resolve({
      items: matching.slice(start, start + query.pageSize).map(toSummary),
      total: matching.length,
    });
  }

  run(id: string): Promise<ConsolidationRunRecord | null> {
    return Promise.resolve(RECORDS.find((run) => run.id === id) ?? null);
  }

  previewRows(period: string): Promise<readonly TemplatePreviewRow[]> {
    return Promise.resolve(MOCK_PREVIEW_ROWS[period] ?? []);
  }
}
