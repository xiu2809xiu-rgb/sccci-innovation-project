import { Injectable } from '@nestjs/common';
import {
  REALTIME_EVENTS,
  type SyncCounts,
  type SyncMode,
  type SyncProgressEvent,
  type SyncRunStatus,
  type SyncStage,
} from '@huitong/shared';

import { RealtimeService } from '../../../infrastructure/events/realtime.service.js';
import { SyncRunsRepository } from './sync-runs.repository.js';

export interface RunIdentity {
  id: string;
  connectorId: string;
  mode: SyncMode;
}

/** Writes at most this often while records stream through, so progress never slows the sync. */
const MIN_INTERVAL_MS = 300;

/**
 * Publishes a run's progress to the database and to the live stream. Messages
 * carry ids, status and counts only (ADR 0008). Stage changes and the final
 * state always go out; updates in between are throttled.
 */
@Injectable()
export class SyncProgressReporter {
  private readonly lastSent = new Map<string, number>();

  constructor(
    private readonly runs: SyncRunsRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async report(
    run: RunIdentity,
    update: {
      status: SyncRunStatus;
      stage: SyncStage | null;
      progress: number;
      counts: SyncCounts;
    },
    force = false,
  ): Promise<void> {
    const now = Date.now();
    if (!force && now - (this.lastSent.get(run.id) ?? 0) < MIN_INTERVAL_MS) return;
    this.lastSent.set(run.id, now);
    const progress = Math.max(0, Math.min(100, Math.round(update.progress)));
    await this.runs.updateProgress(run.id, {
      stage: update.stage,
      progress,
      counts: update.counts,
    });
    const event: SyncProgressEvent = {
      syncRunId: run.id,
      connectorId: run.connectorId,
      mode: run.mode,
      status: update.status,
      stage: update.stage,
      progress,
      counts: { ...update.counts },
    };
    this.realtime.publish(REALTIME_EVENTS.syncProgress, event);
  }

  forget(runId: string): void {
    this.lastSent.delete(runId);
  }
}
