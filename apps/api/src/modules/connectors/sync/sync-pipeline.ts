import type { SyncCounts, SyncPreviewItem, SyncStage } from '@huitong/shared';

import type { RequestMeta } from '../../../common/http/request-meta.js';
import type { RunFailure } from './sync-runs.repository.js';
import type { RunIdentity, SyncProgressReporter } from './sync-progress.reporter.js';

export interface SyncContext {
  run: RunIdentity;
  /** Who the run acts for, recorded with every audit event it writes. */
  meta: RequestMeta;
}

/** A step either hands its result to the next stage or drops the record with a reason. */
export type Step<T> = { ok: true; value: T } | { ok: false; failure: RunFailure };

export type LoadOutcome =
  | { kind: 'created' | 'updated' | 'unchanged'; conflicts: number; preview: SyncPreviewItem[] }
  | { kind: 'rejected'; failure: RunFailure };

export interface SyncSummary {
  counts: SyncCounts;
  failures: RunFailure[];
  preview: SyncPreviewItem[];
}

/** Where each stage starts and ends on the progress bar. */
const SPAN: Record<SyncStage, [number, number]> = {
  EXTRACT: [0, 20],
  MAP: [20, 35],
  VALIDATE: [35, 50],
  LOAD: [50, 95],
  AUDIT: [95, 100],
};

/**
 * Template Method for every sync: extract, map, validate, load, audit, always
 * in that order, with the same progress, counting and failure handling.
 * Subclasses supply the five steps for one kind of data. A record that fails a
 * step is reported and dropped; the rest carry on, so one bad row never stops
 * a run (the run then ends PARTIAL).
 */
export abstract class SyncPipeline<
  TExtracted,
  TMapped,
  TValid,
  TContext extends SyncContext = SyncContext,
> {
  constructor(protected readonly progress: SyncProgressReporter) {}

  async run(context: TContext): Promise<SyncSummary> {
    const counts: SyncCounts = {
      fetched: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      conflicts: 0,
      errors: 0,
    };
    const failures: RunFailure[] = [];
    const preview: SyncPreviewItem[] = [];
    const fail = (failure: RunFailure) => {
      failures.push(failure);
      counts.errors += 1;
    };

    await this.enter(context, 'EXTRACT', counts);
    const extracted = await this.extract(context);
    counts.fetched = extracted.length;

    await this.enter(context, 'MAP', counts);
    const mapped = this.keep(
      extracted.map((item) => this.map(context, item)),
      fail,
    );

    await this.enter(context, 'VALIDATE', counts);
    const valid = this.keep(
      mapped.map((item) => this.validate(context, item)),
      fail,
    );

    await this.enter(context, 'LOAD', counts);
    const [from, to] = SPAN.LOAD;
    for (const [index, item] of valid.entries()) {
      const outcome = await this.load(context, item);
      if (outcome.kind === 'rejected') {
        fail(outcome.failure);
      } else {
        counts[outcome.kind] += 1;
        counts.conflicts += outcome.conflicts;
        preview.push(...outcome.preview);
      }
      const progress = from + ((to - from) * (index + 1)) / valid.length;
      await this.progress.report(context.run, {
        status: 'RUNNING',
        stage: 'LOAD',
        progress,
        counts,
      });
    }

    await this.enter(context, 'AUDIT', counts);
    const summary = { counts, failures, preview };
    await this.audit(context, summary);
    return summary;
  }

  protected abstract extract(context: TContext): Promise<TExtracted[]>;
  protected abstract map(context: TContext, item: TExtracted): Step<TMapped>;
  protected abstract validate(context: TContext, item: TMapped): Step<TValid>;
  protected abstract load(context: TContext, item: TValid): Promise<LoadOutcome>;
  protected abstract audit(context: TContext, summary: SyncSummary): Promise<void>;

  private async enter(context: TContext, stage: SyncStage, counts: SyncCounts): Promise<void> {
    await this.progress.report(
      context.run,
      { status: 'RUNNING', stage, progress: SPAN[stage][0], counts },
      true,
    );
  }

  private keep<T>(steps: Step<T>[], fail: (failure: RunFailure) => void): T[] {
    const kept: T[] = [];
    for (const step of steps) {
      if (step.ok) kept.push(step.value);
      else fail(step.failure);
    }
    return kept;
  }
}
