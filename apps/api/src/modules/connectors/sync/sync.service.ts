import { randomUUID } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  PREVIEW_VALID_MINUTES,
  statusAllowsSync,
  type SyncMode,
  type SyncRun,
  type SyncRunDetail,
  type SyncTrigger,
} from '@huitong/shared';
import type { Queue } from 'bullmq';

import {
  ConflictError,
  ImportFileMissingError,
  ImportFileOutdatedError,
  NotFoundError,
  SyncInProgressError,
} from '../../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../../common/http/authenticated-user.js';
import type { RequestMeta } from '../../../common/http/request-meta.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { QUEUES } from '../../../infrastructure/queues/queue-names.js';
import { FieldMasker } from '../../access/field-masker.js';
import { MappingConfigsRepository } from '../../mapping/mapping-configs.repository.js';
import { ConnectorCapabilityError } from '../adapters/connector-capability.error.js';
import { ConnectorFactory } from '../connector-factory.js';
import { ConnectorsRepository } from '../connectors.repository.js';
import { StagedImportStore, type StagedFile } from '../imports/staged-import.store.js';
import { syncRunDetailView, syncRunView, type RunReferences } from './sync-run.view.js';
import { SyncRecovery } from './sync-recovery.js';
import { SyncRunsRepository } from './sync-runs.repository.js';

/** What a sync job carries: the run and who it acts for. Never personal data. */
export interface SyncJobData {
  syncRunId: string;
  actor: Pick<AuthenticatedUser, 'id' | 'role' | 'homeEntityCode'> | null;
  traceId: string;
}

/**
 * Starts and reads sync runs. A run is queued as a BullMQ job whose id is the
 * run id; the `Idempotency-Key` header maps a repeated request to the same run,
 * and a connector runs one sync at a time.
 */
@Injectable()
export class SyncService {
  constructor(
    @InjectQueue(QUEUES.sync) private readonly queue: Queue<SyncJobData>,
    private readonly runs: SyncRunsRepository,
    private readonly connectors: ConnectorsRepository,
    private readonly mappings: MappingConfigsRepository,
    private readonly factory: ConnectorFactory,
    private readonly audit: AuditLogService,
    private readonly masker: FieldMasker,
    private readonly recovery: SyncRecovery,
    private readonly staged: StagedImportStore,
  ) {}

  async start(
    connectorId: string,
    request: {
      mode: SyncMode;
      trigger: SyncTrigger;
      idempotencyKey?: string | undefined;
      previewRunId?: string | undefined;
    },
    meta: RequestMeta,
  ): Promise<{ run: SyncRun; created: boolean }> {
    const connector = await this.connectors.findById(connectorId);
    if (!connector) throw new NotFoundError(`Connector ${connectorId}`);
    if (!this.factory.create(connector).canFetchEmployees) {
      throw new ConnectorCapabilityError(connectorId, 'employees');
    }
    if (!statusAllowsSync(connector.type, connector.status)) {
      throw new ConflictError(
        `Connector ${connectorId} is ${connector.status.toLowerCase()}, so it cannot sync`,
      );
    }

    const idempotencyKey = `${connectorId}:${request.idempotencyKey ?? randomUUID()}`;
    const repeated = await this.runs.findByIdempotencyKey(idempotencyKey);
    if (repeated) return { run: await this.view(repeated), created: false };
    if (request.trigger === 'MANUAL' && request.mode === 'APPLY') {
      await this.requireRecentPreview(connectorId, request.previewRunId);
    }

    const active = await this.runs.findActive(connectorId);
    if (active && !(await this.recovery.settleIfOrphaned(active, meta))) {
      throw new SyncInProgressError('A sync is already running for this connector', {
        syncRunId: active.id,
      });
    }
    const mapping = await this.mappings.findActive(connectorId);
    if (!mapping) throw new ConflictError(`Connector ${connectorId} has no approved mapping yet`);
    const file =
      connector.type === 'FILE_IMPORT'
        ? await this.requireStagedFile(connectorId, mapping.version)
        : null;

    const run = await this.runs.create({
      connectorId,
      trigger: request.trigger,
      mode: request.mode,
      idempotencyKey,
      triggeredByUserId: meta.actor?.id ?? null,
      mappingConfigId: mapping.id,
      previewRunId: request.mode === 'APPLY' ? (request.previewRunId ?? null) : null,
    });
    await this.audit.record(
      {
        action: 'sync.run.requested',
        entityType: 'SyncRun',
        entityId: run.id,
        metadata: {
          connectorId,
          mode: request.mode,
          trigger: request.trigger,
          // Which file a file connector's run reads, so the trail names what was imported.
          ...(file ? { file: { name: file.summary.fileName, sha256: file.sha256 } } : {}),
        },
      },
      meta,
    );
    const actor = meta.actor
      ? { id: meta.actor.id, role: meta.actor.role, homeEntityCode: meta.actor.homeEntityCode }
      : null;
    await this.queue.add(
      'employees',
      { syncRunId: run.id, actor, traceId: meta.traceId },
      { jobId: run.id },
    );
    return { run: await this.view(run), created: true };
  }

  async detail(id: string, viewer: AuthenticatedUser): Promise<SyncRunDetail> {
    const run = await this.runs.findDetail(id);
    if (!run) throw new NotFoundError(`Sync run ${id}`);
    return syncRunDetailView(run, await this.references([run]), viewer, this.masker);
  }

  async listForConnector(connectorId: string, page: number, pageSize: number) {
    const { items, total } = await this.runs.listForConnector(connectorId, page, pageSize);
    const refs = await this.references(items);
    return { items: items.map((run) => syncRunView(run, refs)), total };
  }

  async references(
    runs: readonly { triggeredByUserId: string | null; mappingConfigId: string | null }[],
  ): Promise<RunReferences> {
    const userIds = [
      ...new Set(runs.flatMap((run) => (run.triggeredByUserId ? [run.triggeredByUserId] : []))),
    ];
    const configIds = [
      ...new Set(runs.flatMap((run) => (run.mappingConfigId ? [run.mappingConfigId] : []))),
    ];
    const [people, versions] = await Promise.all([
      userIds.length > 0 ? this.runs.displayNames(userIds) : Promise.resolve([]),
      configIds.length > 0 ? this.runs.mappingVersions(configIds) : Promise.resolve([]),
    ]);
    return {
      people: new Map(people.map((person) => [person.id, person.displayName])),
      versions: new Map(versions.map((config) => [config.id, config.version])),
    };
  }

  /** A file connector syncs only a staged file, read through the mapping version active now. */
  private async requireStagedFile(connectorId: string, version: number): Promise<StagedFile> {
    const staged = await this.staged.summary(connectorId);
    if (!staged) throw new ImportFileMissingError(connectorId);
    if (staged.summary.mappingVersion !== version) throw new ImportFileOutdatedError();
    return staged;
  }

  /** Error prevention on the server: a person applies a sync only after previewing it. */
  private async requireRecentPreview(
    connectorId: string,
    previewRunId: string | undefined,
  ): Promise<void> {
    const preview = previewRunId ? await this.runs.findById(previewRunId) : null;
    const usable =
      preview?.connectorId === connectorId &&
      preview.mode === 'PREVIEW' &&
      (preview.status === 'SUCCEEDED' || preview.status === 'PARTIAL') &&
      preview.finishedAt !== null &&
      Date.now() - preview.finishedAt.getTime() <= PREVIEW_VALID_MINUTES * 60_000;
    if (!usable) {
      throw new ConflictError(
        `Preview this sync first: applying needs a successful preview from the last ${String(PREVIEW_VALID_MINUTES)} minutes`,
      );
    }
  }

  private async view(run: Parameters<typeof syncRunView>[0]): Promise<SyncRun> {
    return syncRunView(run, await this.references([run]));
  }
}
