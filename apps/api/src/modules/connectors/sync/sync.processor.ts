import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  MAX_PREVIEW_ITEMS,
  REALTIME_EVENTS,
  type SyncProgressEvent,
  type SyncRunStatus,
} from '@huitong/shared';
import { UnrecoverableError, type Job } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

import { AppError } from '../../../common/errors/app-error.js';
import type { RequestMeta } from '../../../common/http/request-meta.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { RealtimeService } from '../../../infrastructure/events/realtime.service.js';
import { QUEUES } from '../../../infrastructure/queues/queue-names.js';
import { MappingConfigsRepository } from '../../mapping/mapping-configs.repository.js';
import { ConnectorFactory } from '../connector-factory.js';
import { ConnectorsRepository } from '../connectors.repository.js';
import { FileImportService } from '../imports/file-import.service.js';
import { EmployeeSyncPipeline } from './employee-sync.pipeline.js';
import type { SystemConnector } from '../adapters/system-connector.js';
import { retryCanHelp, withRetries } from './retry-policy.js';
import { SourceChangedError, type SyncSummary } from './sync-pipeline.js';
import { SyncProgressReporter, type RunIdentity } from './sync-progress.reporter.js';
import { SyncRunsRepository } from './sync-runs.repository.js';
import type { SyncJobData } from './sync.service.js';

const TERMINAL = new Set<SyncRunStatus>(['SUCCEEDED', 'PARTIAL', 'FAILED']);

/** What a completed pipeline hands to the bookkeeping: its summary, and the adapter it read. */
interface PipelineDone {
  summary: SyncSummary;
  adapter: SystemConnector;
}

function statusOf(summary: SyncSummary): SyncRunStatus {
  if (summary.counts.errors === 0) return 'SUCCEEDED';
  const { created, updated, unchanged } = summary.counts;
  return created + updated + unchanged > 0 ? 'PARTIAL' : 'FAILED';
}

/**
 * Runs queued syncs, one at a time so two runs never merge into the same
 * records at once. A failure is retried by BullMQ (three attempts with
 * backoff); only the last attempt marks the run FAILED. A retry is safe:
 * unchanged records are skipped and every write is an upsert.
 */
@Processor(QUEUES.sync, { concurrency: 1 })
export class SyncProcessor extends WorkerHost {
  constructor(
    private readonly runs: SyncRunsRepository,
    private readonly connectors: ConnectorsRepository,
    private readonly mappings: MappingConfigsRepository,
    private readonly factory: ConnectorFactory,
    private readonly pipeline: EmployeeSyncPipeline,
    private readonly progress: SyncProgressReporter,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeService,
    private readonly fileImports: FileImportService,
    private readonly logger: PinoLogger,
  ) {
    super();
    this.logger.setContext(SyncProcessor.name);
  }

  async process(job: Job<SyncJobData>): Promise<void> {
    const run = await this.runs.findById(job.data.syncRunId);
    // A job whose run already finished (a duplicate delivery) has nothing left to do.
    if (!run || TERMINAL.has(run.status)) return;
    const identity = { id: run.id, connectorId: run.connectorId, mode: run.mode };
    const meta: RequestMeta = {
      actor: job.data.actor,
      ip: null,
      userAgent: null,
      traceId: job.data.traceId,
    };
    const attempt = job.attemptsMade + 1;
    await this.runs.markRunning(run.id, attempt);

    try {
      let done: PipelineDone;
      try {
        done = await this.runPipeline(run, identity, meta);
      } catch (error) {
        await this.fail(job, identity, meta, attempt, error);
        // Only a failure a retry could fix goes back to BullMQ to be tried again.
        throw retryCanHelp(error)
          ? error
          : new UnrecoverableError(error instanceof Error ? error.message : String(error));
      }
      await this.settle(identity, done, meta);
    } finally {
      this.progress.forget(run.id);
    }
  }

  private async runPipeline(
    run: { connectorId: string; mappingConfigId: string | null; previewRunId: string | null },
    identity: RunIdentity,
    meta: RequestMeta,
  ): Promise<PipelineDone> {
    const connector = await this.connectors.findById(run.connectorId);
    const mapping = run.mappingConfigId ? await this.mappings.findById(run.mappingConfigId) : null;
    if (!connector || !mapping)
      throw new Error('The connector or its mapping version no longer exists');
    const adapter = this.factory.create(connector);
    const summary = await this.pipeline.run({
      run: identity,
      meta,
      connector: adapter,
      mappings: mapping.mappings,
      ...(run.previewRunId
        ? { expectedChanges: await this.changesPreviewed(run.previewRunId) }
        : {}),
    });
    return { summary, adapter };
  }

  /**
   * Records a run the pipeline completed. Its changes are written by now, so a
   * failure here is tried again in place, never by running the pipeline again;
   * should it still fail, the run is left for SyncRecovery to settle.
   */
  private async settle(
    identity: RunIdentity,
    { summary, adapter }: PipelineDone,
    meta: RequestMeta,
  ) {
    const status = statusOf(summary);
    const preview = identity.mode === 'PREVIEW';
    try {
      await withRetries(() => this.runs.recordFailures(identity.id, summary.failures));
      // Before the run is marked finished: whoever sees it finished sees the connector up to date.
      if (!preview && status !== 'FAILED' && adapter.sourceVersion) {
        await this.afterFileImport(identity.connectorId, adapter.sourceVersion, meta);
      }
      await withRetries(() =>
        this.runs.finish(identity.id, {
          status,
          counts: summary.counts,
          preview: preview ? summary.preview.slice(0, MAX_PREVIEW_ITEMS) : null,
          previewTruncated: summary.preview.length > MAX_PREVIEW_ITEMS,
          changeDigest: preview ? summary.changeDigest : null,
        }),
      );
      this.announce(identity, status, summary.counts, status === 'FAILED');
    } catch (error) {
      this.logger.error({ err: error, syncRunId: identity.id }, 'sync done but not recorded');
    }
  }

  /**
   * The applied file is no longer needed, and a draft connector becomes active.
   * The changes are already in the master, so a failure here is logged, not
   * thrown: the staged file expires on its own, and a draft can still import.
   */
  private async afterFileImport(
    connectorId: string,
    sha256: string,
    meta: RequestMeta,
  ): Promise<void> {
    try {
      await this.fileImports.afterApply(connectorId, sha256, meta);
    } catch (error) {
      this.logger.warn({ err: error, connectorId }, 'file import clean-up failed');
    }
  }

  /** What the preview an apply follows found; null if it has no fingerprint, so nothing can match. */
  private async changesPreviewed(previewRunId: string): Promise<string | null> {
    return (await this.runs.findById(previewRunId))?.changeDigest ?? null;
  }

  private async fail(
    job: Job<SyncJobData>,
    run: { id: string; connectorId: string; mode: 'PREVIEW' | 'APPLY' },
    meta: RequestMeta,
    attempt: number,
    error: unknown,
  ): Promise<void> {
    const sourceChanged = error instanceof SourceChangedError;
    const final = !retryCanHelp(error) || attempt >= (job.opts.attempts ?? 1);
    const code = sourceChanged ? error.code : error instanceof AppError ? error.code : 'INTERNAL';
    const message =
      sourceChanged || error instanceof AppError ? error.message : 'The sync stopped unexpectedly';
    this.logger.warn({ err: error, syncRunId: run.id, attempt, final }, 'sync attempt failed');
    await this.runs.recordFailures(run.id, [
      {
        externalId: null,
        stage: sourceChanged ? error.stage : 'EXTRACT',
        code,
        message: `Attempt ${String(attempt)}: ${message}`,
      },
    ]);
    const counts = { fetched: 0, created: 0, updated: 0, unchanged: 0, conflicts: 0, errors: 1 };
    if (!final) {
      await this.runs.markWaitingForRetry(run.id);
      this.announce(run, 'QUEUED', counts, false);
      return;
    }
    await this.runs.finish(run.id, {
      status: 'FAILED',
      counts,
      preview: null,
      previewTruncated: false,
      changeDigest: null,
    });
    await this.audit.record(
      {
        action: 'sync.run.failed',
        entityType: 'SyncRun',
        entityId: run.id,
        metadata: { connectorId: run.connectorId, code, attempts: attempt },
      },
      meta,
    );
    this.announce(run, 'FAILED', counts, true);
  }

  /** Progress at 100 % plus the matching completion event, ids and counts only. */
  private announce(
    run: { id: string; connectorId: string; mode: 'PREVIEW' | 'APPLY' },
    status: SyncRunStatus,
    counts: SyncSummary['counts'],
    failed: boolean,
  ): void {
    const event: SyncProgressEvent = {
      syncRunId: run.id,
      connectorId: run.connectorId,
      mode: run.mode,
      status,
      stage: null,
      progress: status === 'QUEUED' ? 0 : 100,
      counts,
    };
    this.realtime.publish(REALTIME_EVENTS.syncProgress, event);
    if (status !== 'QUEUED') {
      this.realtime.publish(
        failed ? REALTIME_EVENTS.syncFailed : REALTIME_EVENTS.syncCompleted,
        event,
      );
    }
  }
}
