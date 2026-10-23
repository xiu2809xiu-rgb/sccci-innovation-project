import type { SyncCounts, SyncPreviewItem, SyncStage } from '@huitong/shared';

import type { RequestMeta } from '../../../common/http/request-meta.js';
import { changeDigestOf } from './change-digest.js';
import type { RunFailure } from './sync-runs.repository.js';
import type { RunIdentity, SyncProgressReporter } from './sync-progress.reporter.js';

export interface SyncContext {
  run: RunIdentity;
  /** Who the run acts for, recorded with every audit event it writes. */
  meta: RequestMeta;
  /**
   * For an APPLY of a preview: the preview's change digest, which this run
   * must reproduce before it writes anything. Null when the preview has none.
   */
  expectedChanges?: string | null;
}

/** A step either hands its result to the next stage or drops the record with a reason. */
export type Step<T> = { ok: true; value: T } | { ok: false; failure: RunFailure };

export type LoadOutcome =
  | {
      kind: 'created' | 'updated' | 'unchanged';
      conflicts: number;
      preview: SyncPreviewItem[];
      /** For a created record: a hash of its values, which its preview item does not carry. */
      createdHash?: string;
    }
  | { kind: 'rejected'; failure: RunFailure };

export interface SyncSummary {
  counts: SyncCounts;
  failures: RunFailure[];
  preview: SyncPreviewItem[];
  /** The fingerprint of everything the run changed, or would change. */
  changeDigest: string;
}

/**
 * The source changed after the preview this apply follows, so it stops before
 * writing anything. Retrying cannot help: HR has to preview again.
 */
export class SourceChangedError extends Error {
  readonly code = 'SOURCE_CHANGED';
  readonly stage: SyncStage = 'LOAD';

  constructor() {
    super('The source changed after the preview, so nothing was written; preview again');
    this.name = 'SourceChangedError';
  }
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
    if (context.expectedChanges !== undefined) await this.confirmPreview(context, valid);
    const created: string[] = [];
    const [from, to] = SPAN.LOAD;
    for (const [index, item] of valid.entries()) {
      const outcome = await this.load(context, item);
      if (outcome.kind === 'rejected') {
        fail(outcome.failure);
      } else {
        counts[outcome.kind] += 1;
        counts.conflicts += outcome.conflicts;
        preview.push(...outcome.preview);
        if (outcome.createdHash) created.push(outcome.createdHash);
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
    const summary = {
      counts,
      failures,
      preview,
      changeDigest: changeDigestOf({ preview, created, source: this.sourceVersion(context) }),
    };
    await this.audit(context, summary);
    return summary;
  }

  /**
   * Error prevention for an apply: plan every record without writing, and stop
   * unless the plan is exactly the one the preview showed.
   */
  private async confirmPreview(context: TContext, valid: readonly TValid[]): Promise<void> {
    // A PREVIEW-mode load plans the change and writes nothing.
    const planning = { ...context, run: { ...context.run, mode: 'PREVIEW' } } as TContext;
    const preview: SyncPreviewItem[] = [];
    const created: string[] = [];
    for (const item of valid) {
      const outcome = await this.load(planning, item);
      if (outcome.kind === 'rejected') continue;
      preview.push(...outcome.preview);
      if (outcome.createdHash) created.push(outcome.createdHash);
    }
    const source = this.sourceVersion(context);
    if (changeDigestOf({ preview, created, source }) !== context.expectedChanges) {
      throw new SourceChangedError();
    }
  }

  protected abstract extract(context: TContext): Promise<TExtracted[]>;
  /** The version of the source the extract read, when the source names one; otherwise null. */
  protected abstract sourceVersion(context: TContext): string | null;
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
