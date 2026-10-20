import { Injectable } from '@nestjs/common';
import type {
  SyncCounts,
  SyncMode,
  SyncPreviewItem,
  SyncRunStatus,
  SyncStage,
  SyncTrigger,
} from '@huitong/shared';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { jsonColumn } from '../../employees/employees.repository.js';

export interface RunFailure {
  externalId: string | null;
  stage: SyncStage;
  code: string;
  message: string;
}

/** The most failures one run keeps; the error count still covers all of them. */
const MAX_STORED_FAILURES = 500;

const counted = (counts: SyncCounts) => ({
  fetchedCount: counts.fetched,
  createdCount: counts.created,
  updatedCount: counts.updated,
  unchangedCount: counts.unchanged,
  conflictCount: counts.conflicts,
  errorCount: counts.errors,
});

/** Sync runs: their lifecycle, progress, failures and previews. */
@Injectable()
export class SyncRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(run: {
    connectorId: string;
    trigger: SyncTrigger;
    mode: SyncMode;
    idempotencyKey: string;
    triggeredByUserId: string | null;
    mappingConfigId: string;
  }) {
    return this.prisma.syncRun.create({ data: run });
  }

  findById(id: string) {
    return this.prisma.syncRun.findUnique({ where: { id } });
  }

  findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.syncRun.findUnique({ where: { idempotencyKey } });
  }

  findActive(connectorId: string) {
    return this.prisma.syncRun.findFirst({
      where: { connectorId, status: { in: ['QUEUED', 'RUNNING'] } },
      orderBy: { queuedAt: 'desc' },
    });
  }

  async markRunning(id: string, attempt: number): Promise<void> {
    const run = await this.prisma.syncRun.findUnique({
      where: { id },
      select: { startedAt: true },
    });
    await this.prisma.syncRun.update({
      where: { id },
      data: {
        status: 'RUNNING',
        attempt,
        stage: 'EXTRACT',
        progress: 0,
        startedAt: run?.startedAt ?? new Date(),
      },
    });
  }

  async updateProgress(
    id: string,
    update: { stage: SyncStage | null; progress: number; counts: SyncCounts },
  ): Promise<void> {
    await this.prisma.syncRun.update({
      where: { id },
      data: { stage: update.stage, progress: update.progress, ...counted(update.counts) },
    });
  }

  /** Back to the queue while BullMQ waits to retry. */
  async markWaitingForRetry(id: string): Promise<void> {
    await this.prisma.syncRun.update({ where: { id }, data: { status: 'QUEUED', stage: null } });
  }

  async finish(
    id: string,
    result: {
      status: SyncRunStatus;
      counts: SyncCounts;
      preview: readonly SyncPreviewItem[] | null;
      previewTruncated: boolean;
    },
  ): Promise<Date> {
    const finishedAt = new Date();
    const run = await this.prisma.syncRun.update({
      where: { id },
      data: {
        status: result.status,
        stage: null,
        progress: 100,
        finishedAt,
        ...counted(result.counts),
        ...(result.preview
          ? { previewItems: jsonColumn(result.preview), previewTruncated: result.previewTruncated }
          : {}),
      },
      select: { connectorId: true, mode: true },
    });
    if (run.mode === 'APPLY' && result.status !== 'FAILED') {
      await this.prisma.connector.update({
        where: { id: run.connectorId },
        data: { lastSyncAt: finishedAt },
      });
    }
    return finishedAt;
  }

  async recordFailures(syncRunId: string, failures: readonly RunFailure[]): Promise<void> {
    if (failures.length === 0) return;
    await this.prisma.syncError.createMany({
      data: failures.slice(0, MAX_STORED_FAILURES).map((failure) => ({ syncRunId, ...failure })),
    });
  }

  findDetail(id: string) {
    return this.prisma.syncRun.findUnique({
      where: { id },
      include: { errors: { orderBy: { createdAt: 'asc' }, take: MAX_STORED_FAILURES } },
    });
  }

  async listForConnector(connectorId: string, page: number, pageSize: number) {
    const where = { connectorId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.syncRun.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.syncRun.count({ where }),
    ]);
    return { items, total };
  }

  /** The latest run of each connector. */
  async latestPerConnector(connectorIds: readonly string[]) {
    const runs = await this.prisma.syncRun.findMany({
      where: { connectorId: { in: [...connectorIds] } },
      orderBy: { queuedAt: 'desc' },
      distinct: ['connectorId'],
    });
    return new Map(runs.map((run) => [run.connectorId, run]));
  }

  mappingVersions(ids: readonly string[]) {
    return this.prisma.mappingConfig.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, version: true },
    });
  }

  displayNames(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
  }

  /** True once any sync has ever been requested (the bootstrap runs only on a fresh stack). */
  async anyRun(): Promise<boolean> {
    return (await this.prisma.syncRun.count({ take: 1 })) > 0;
  }
}
