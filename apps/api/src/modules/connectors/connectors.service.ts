import { Injectable } from '@nestjs/common';
import {
  mappingSetSchema,
  statusAllowsSync,
  type ConnectorDetail,
  type ConnectorSummary,
  type EntityCode,
  type HealthCheckResult,
  type HealthStatus,
  type MappingConfig,
  type StagedImport,
} from '@huitong/shared';
import { PinoLogger } from 'nestjs-pino';

import { NotFoundError } from '../../common/errors/app-error.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import type { Connector } from '../../generated/prisma/client.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { MappingConfigsRepository } from '../mapping/mapping-configs.repository.js';
import { ConnectorFactory } from './connector-factory.js';
import { ConnectorsRepository } from './connectors.repository.js';
import { StagedImportStore, StagedImportUnavailableError } from './imports/staged-import.store.js';
import { syncRunView } from './sync/sync-run.view.js';
import { SyncRunsRepository } from './sync/sync-runs.repository.js';
import { SyncService } from './sync/sync.service.js';

type Primitive = string | number | boolean;

function primitives(config: unknown): Record<string, Primitive> {
  if (config === null || typeof config !== 'object') return {};
  return Object.fromEntries(
    Object.entries(config as Record<string, unknown>).filter(
      (entry): entry is [string, Primitive] =>
        ['string', 'number', 'boolean'].includes(typeof entry[1]),
    ),
  );
}

/** The connector hub: every connected system, its health, its mapping versions and its runs. */
@Injectable()
export class ConnectorsService {
  constructor(
    private readonly connectors: ConnectorsRepository,
    private readonly runs: SyncRunsRepository,
    private readonly mappings: MappingConfigsRepository,
    private readonly factory: ConnectorFactory,
    private readonly sync: SyncService,
    private readonly audit: AuditLogService,
    private readonly staged: StagedImportStore,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConnectorsService.name);
  }

  async list(): Promise<ConnectorSummary[]> {
    const rows = await this.connectors.list();
    return this.summaries(rows);
  }

  async detail(id: string): Promise<ConnectorDetail> {
    const row = await this.connectors.findById(id);
    if (!row) throw new NotFoundError(`Connector ${id}`);
    const [[summary], configs] = await Promise.all([
      this.summaries([row]),
      this.mappings.listForConnector(id),
    ]);
    if (!summary) throw new NotFoundError(`Connector ${id}`);
    const approverIds = [
      ...new Set(
        configs.flatMap((config) => (config.approvedByUserId ? [config.approvedByUserId] : [])),
      ),
    ];
    const names = new Map(
      (approverIds.length > 0 ? await this.connectors.displayNames(approverIds) : []).map(
        (person) => [person.id, person.displayName],
      ),
    );
    const mappingConfigs: MappingConfig[] = configs.map((config) => ({
      id: config.id,
      connectorId: config.connectorId,
      version: config.version,
      status: config.status,
      mappings: mappingSetSchema.safeParse(config.mappings).data ?? [],
      notes: config.notes,
      approvedBy: config.approvedByUserId
        ? { id: config.approvedByUserId, displayName: names.get(config.approvedByUserId) ?? '' }
        : null,
      approvedAt: config.approvedAt?.toISOString() ?? null,
      proposalId: config.proposalId,
      createdAt: config.createdAt.toISOString(),
    }));
    return {
      ...summary,
      baseUrl: row.baseUrl,
      config: primitives(row.config),
      credentialsRef: row.secretRef,
      mappingConfigs,
    };
  }

  async checkHealth(id: string, meta: RequestMeta): Promise<HealthCheckResult> {
    const row = await this.connectors.findById(id);
    if (!row) throw new NotFoundError(`Connector ${id}`);
    const health = await this.factory.create(row).checkHealth();
    const checkedAt = new Date();
    await this.connectors.recordHealth(id, health.status, checkedAt);
    await this.audit.record(
      {
        action: 'connector.health-checked',
        entityType: 'Connector',
        entityId: id,
        metadata: { status: health.status },
      },
      meta,
    );
    return { ...health, checkedAt: checkedAt.toISOString() };
  }

  private async summaries(rows: readonly Connector[]): Promise<ConnectorSummary[]> {
    const ids = rows.map((row) => row.id);
    const [latest, versions] = await Promise.all([
      this.runs.latestPerConnector(ids),
      this.mappings.activeVersions(ids),
    ]);
    const refs = await this.sync.references([...latest.values()]);
    const stagedFiles = new Map(
      await Promise.all(
        rows
          .filter((row) => row.type === 'FILE_IMPORT')
          .map(async (row) => [row.id, await this.stagedSummary(row.id)] as const),
      ),
    );
    return rows.map((row) => {
      const stagedImport = stagedFiles.get(row.id) ?? null;
      const run = latest.get(row.id);
      return {
        id: row.id,
        name: row.name,
        nameZh: row.nameZh,
        type: row.type,
        region: row.region,
        entityCode: (row.entityCode as EntityCode | null) ?? null,
        status: row.status,
        isMock: row.isMock,
        capabilities: row.capabilities,
        syncable: this.syncable(row, versions.get(row.id) ?? null, stagedImport),
        stagedImport,
        lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
        lastHealthCheckAt: row.lastHealthCheckAt?.toISOString() ?? null,
        lastHealthStatus: (row.lastHealthStatus as HealthStatus | null) ?? null,
        activeMappingVersion: versions.get(row.id) ?? null,
        latestRun: run ? syncRunView(run, refs) : null,
      };
    });
  }

  /**
   * Whether Sync now is offered: the same rules SyncService.start enforces. A
   * live system syncs whenever its adapter can pull; a file connector only with
   * a file staged for its active mapping version.
   */
  private syncable(row: Connector, version: number | null, staged: StagedImport | null): boolean {
    if (!this.factory.create(row).canFetchEmployees) return false;
    if (!statusAllowsSync(row.type, row.status)) return false;
    return row.type !== 'FILE_IMPORT' || (version !== null && staged?.mappingVersion === version);
  }

  /** A file connector's staged file; a page still loads, without it, when Redis does not answer. */
  private async stagedSummary(connectorId: string): Promise<StagedImport | null> {
    try {
      return (await this.staged.summary(connectorId))?.summary ?? null;
    } catch (error) {
      if (!(error instanceof StagedImportUnavailableError)) throw error;
      this.logger.warn({ connectorId }, 'staged file unknown: Redis did not answer in time');
      return null;
    }
  }
}
