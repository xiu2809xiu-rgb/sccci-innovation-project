import type {
  ConsolidationException,
  ConsolidationRunDetail,
  ConsolidationRunListQuery,
  ConsolidationRunSummary,
  TemplatePreviewRow,
} from '@huitong/shared';

import type { Page } from '../../common/http/page.js';

/** A run with every entity's exceptions; the service keeps the ones the caller may see. */
export type ConsolidationRunRecord = Omit<ConsolidationRunDetail, 'withheldExceptionCount'> & {
  exceptions: ConsolidationException[];
};

/**
 * The consolidation read model the controllers depend on. The head start
 * binds MockConsolidationRepository (typed sample data); area 3 replaces it
 * with a Prisma-backed repository over `ConsolidationRun`, its exceptions and
 * the rendered report, and removes @ServesMockData() from the routes.
 */
export abstract class ConsolidationRepository {
  abstract runs(query: ConsolidationRunListQuery): Promise<Page<ConsolidationRunSummary>>;

  /** Null when no run has this id. */
  abstract run(id: string): Promise<ConsolidationRunRecord | null>;

  /** Every entity's rows of a month in the company template; none when it has not been consolidated. */
  abstract previewRows(period: string): Promise<readonly TemplatePreviewRow[]>;
}
