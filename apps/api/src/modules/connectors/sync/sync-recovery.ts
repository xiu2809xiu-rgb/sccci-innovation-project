import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PinoLogger } from 'nestjs-pino';

import type { RequestMeta } from '../../../common/http/request-meta.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { QUEUES } from '../../../infrastructure/queues/queue-names.js';
import { SyncRunsRepository } from './sync-runs.repository.js';
import type { SyncJobData } from './sync.service.js';

/** Job states in which BullMQ will still run the job. */
const PENDING_STATES = new Set(['waiting', 'delayed', 'prioritized', 'active', 'waiting-children']);

/** A run is queued right after its row is written; a row this old without a job never will be. */
const ORPHANED_AFTER_MS = 60_000;

type UnfinishedRun = NonNullable<Awaited<ReturnType<SyncRunsRepository['findActive']>>>;

/**
 * Settles a sync run that no job will ever finish. BullMQ re-runs a job that
 * stalled when the API stopped, but a run whose job is gone (Redis was reset)
 * or ended without updating the run would stay QUEUED or RUNNING and block its
 * connector for good. Checked when someone starts a sync, where it matters.
 */
@Injectable()
export class SyncRecovery {
  constructor(
    @InjectQueue(QUEUES.sync) private readonly queue: Queue<SyncJobData>,
    private readonly runs: SyncRunsRepository,
    private readonly audit: AuditLogService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SyncRecovery.name);
  }

  /** Marks `run` FAILED when nothing will finish it. Resolves with whether it did. */
  async settleIfOrphaned(run: UnfinishedRun, meta: RequestMeta): Promise<boolean> {
    const job = await this.queue.getJob(run.id);
    if (job) {
      if (PENDING_STATES.has(await job.getState())) return false;
    } else if (Date.now() - run.queuedAt.getTime() < ORPHANED_AFTER_MS) {
      return false;
    }

    await this.runs.recordFailures(run.id, [
      {
        externalId: null,
        stage: run.stage ?? 'EXTRACT',
        code: 'INTERRUPTED',
        message: 'The sync was interrupted before it finished; run it again',
      },
    ]);
    await this.runs.finish(run.id, {
      status: 'FAILED',
      counts: {
        fetched: run.fetchedCount,
        created: run.createdCount,
        updated: run.updatedCount,
        unchanged: run.unchangedCount,
        conflicts: run.conflictCount,
        errors: run.errorCount + 1,
      },
      preview: null,
      previewTruncated: false,
      changeDigest: null,
    });
    await this.audit.record(
      {
        action: 'sync.run.failed',
        entityType: 'SyncRun',
        entityId: run.id,
        metadata: { connectorId: run.connectorId, code: 'INTERRUPTED', attempts: run.attempt },
      },
      meta,
    );
    this.logger.warn(
      { syncRunId: run.id, connectorId: run.connectorId },
      'settled an interrupted sync run',
    );
    return true;
  }
}
