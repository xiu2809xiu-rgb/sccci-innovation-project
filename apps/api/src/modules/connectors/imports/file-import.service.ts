import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  MAX_REJECTED_ROWS_LISTED,
  STAGED_IMPORT_TTL_MINUTES,
  statusAllowsSync,
  type SampleEncoding,
  type StagedImport,
} from '@huitong/shared';

import {
  ConflictError,
  NotFoundError,
  SyncInProgressError,
  ValidationFailedError,
} from '../../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../../common/http/authenticated-user.js';
import type { RequestMeta } from '../../../common/http/request-meta.js';
import { safeFileName } from '../../../common/http/safe-file-name.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import { MappingConfigsRepository } from '../../mapping/mapping-configs.repository.js';
import { MappingEngine } from '../../mapping/mapping-engine.js';
import { refuseFile } from '../../mapping/proposals/file-refusal.js';
import {
  MAX_UNZIPPED_BYTES,
  SampleFileReader,
  type ReadLimits,
  type UploadedFile,
} from '../../mapping/proposals/sample-file-reader.js';
import { ConnectorsRepository } from '../connectors.repository.js';
import { SyncRecovery } from '../sync/sync-recovery.js';
import { SyncRunsRepository } from '../sync/sync-runs.repository.js';
import { StagedImportStore } from './staged-import.store.js';
import { rejectionsByReason, stageRows } from './staged-rows.js';

/** An import reads the whole file, and refuses one that is too big rather than cutting it short. */
export const IMPORT_LIMITS: ReadLimits = {
  maxBytes: MAX_IMPORT_BYTES,
  maxRows: MAX_IMPORT_ROWS,
  maxUnzippedBytes: MAX_UNZIPPED_BYTES,
  overflow: 'refuse',
};

/**
 * Imports a file into a file connector in two steps. Staging reads the file
 * through the connector's approved mapping and keeps only what the mapping
 * needs; the ordinary sync then previews and applies it, so a file meets the
 * same rules as a live system. An applied import deletes its staged file, and
 * a draft connector becomes active with its first import.
 */
@Injectable()
export class FileImportService {
  constructor(
    private readonly connectors: ConnectorsRepository,
    private readonly mappings: MappingConfigsRepository,
    private readonly reader: SampleFileReader,
    private readonly engine: MappingEngine,
    private readonly staged: StagedImportStore,
    private readonly runs: SyncRunsRepository,
    private readonly recovery: SyncRecovery,
    private readonly audit: AuditLogService,
  ) {}

  async stage(
    connectorId: string,
    file: UploadedFile | undefined,
    encoding: SampleEncoding | undefined,
    meta: RequestMeta & { actor: AuthenticatedUser },
  ): Promise<StagedImport> {
    const connector = await this.fileConnector(connectorId);
    if (!statusAllowsSync(connector.type, connector.status)) {
      throw new ConflictError(
        `${connectorId} is ${connector.status.toLowerCase()}, so it takes no file to import`,
      );
    }
    if (!file) {
      throw new ValidationFailedError([{ path: 'file', message: 'Choose a file to import' }]);
    }
    await this.requireNoSync(connectorId, meta);
    const mapping = await this.mappings.findActive(connectorId);
    if (!mapping) {
      throw new ConflictError('Approve a mapping for this connector before importing a file');
    }
    const sample = await this.reader.read(file, encoding, IMPORT_LIMITS);
    const staging = stageRows(sample, mapping.mappings, this.engine);
    if (staging.records.length === 0) {
      // Nothing to stage: say why each row was left out, so HR knows what to correct.
      refuseFile(
        { problem: 'NO_ROWS_KEPT', reasons: rejectionsByReason(staging.rejectedRows) },
        'No row of the file can be imported',
      );
    }

    const stagedAt = new Date();
    const summary: StagedImport = {
      connectorId,
      fileName: safeFileName(file.originalname, 'import'),
      rowCount: staging.records.length,
      rejectedCount: staging.rejectedRows.length,
      rejectedRows: staging.rejectedRows.slice(0, MAX_REJECTED_ROWS_LISTED),
      droppedColumns: staging.droppedColumns,
      mappingVersion: mapping.version,
      stagedAt: stagedAt.toISOString(),
      expiresAt: new Date(stagedAt.getTime() + STAGED_IMPORT_TTL_MINUTES * 60_000).toISOString(),
    };
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const replaced = await this.staged.delete(connectorId);
    await this.staged.put({
      summary,
      stagedByUserId: meta.actor.id,
      sha256,
      records: staging.records,
    });
    await this.audit.record(
      {
        action: 'connector.import.staged',
        entityType: 'Connector',
        entityId: connectorId,
        metadata: {
          fileName: summary.fileName,
          sha256,
          rows: summary.rowCount,
          rejected: summary.rejectedCount,
          droppedColumns: summary.droppedColumns.length,
          mappingVersion: summary.mappingVersion,
          replaced,
        },
      },
      meta,
    );
    return summary;
  }

  /** The connector's staged file, without its rows; null when none is waiting. */
  async current(connectorId: string): Promise<StagedImport | null> {
    await this.fileConnector(connectorId);
    return (await this.staged.summary(connectorId))?.summary ?? null;
  }

  async discard(connectorId: string, meta: RequestMeta): Promise<void> {
    await this.fileConnector(connectorId);
    await this.requireNoSync(connectorId, meta);
    if (await this.staged.delete(connectorId)) {
      await this.audit.record(
        { action: 'connector.import.discarded', entityType: 'Connector', entityId: connectorId },
        meta,
      );
    }
  }

  /**
   * After an apply that imported rows: the file it read has done its job and is
   * deleted, and a draft connector becomes active. Only that file is deleted:
   * one staged meanwhile is kept. A failed apply keeps the file, so HR can
   * preview and apply again.
   */
  async afterApply(connectorId: string, sha256: string, meta: RequestMeta): Promise<void> {
    if (await this.staged.deleteIfSame(connectorId, sha256)) {
      await this.audit.record(
        {
          action: 'connector.import.cleared',
          entityType: 'Connector',
          entityId: connectorId,
          metadata: { reason: 'APPLIED', sha256 },
        },
        meta,
      );
    }
    if (await this.connectors.activateDraft(connectorId)) {
      await this.audit.record(
        {
          action: 'connector.activated',
          entityType: 'Connector',
          entityId: connectorId,
          metadata: { reason: 'FIRST_IMPORT' },
        },
        meta,
      );
    }
  }

  private async fileConnector(connectorId: string) {
    const connector = await this.connectors.findById(connectorId);
    if (!connector) throw new NotFoundError(`Connector ${connectorId}`);
    if (connector.type !== 'FILE_IMPORT') {
      throw new ConflictError(`${connectorId} is not a file connector, so it takes no file`);
    }
    return connector;
  }

  /** The staged file stays as it is while a sync of the connector runs, which reads it. */
  private async requireNoSync(connectorId: string, meta: RequestMeta): Promise<void> {
    const active = await this.runs.findActive(connectorId);
    if (active && !(await this.recovery.settleIfOrphaned(active, meta))) {
      throw new SyncInProgressError(
        'A sync of this connector is running: change the staged file once it finishes',
        { syncRunId: active.id },
      );
    }
  }
}
