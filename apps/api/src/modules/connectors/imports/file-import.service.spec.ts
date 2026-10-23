import { MAX_IMPORT_ROWS } from '@huitong/shared';
import { describe, expect, it, vi } from 'vitest';

import {
  ConflictError,
  SyncInProgressError,
  ValidationFailedError,
} from '../../../common/errors/app-error.js';
import type { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import type { MappingConfigsRepository } from '../../mapping/mapping-configs.repository.js';
import { MappingEngine } from '../../mapping/mapping-engine.js';
import { SampleFileReader } from '../../mapping/proposals/sample-file-reader.js';
import { TransformerRegistry } from '../../mapping/transformers/transformer-registry.js';
import type { ConnectorsRepository } from '../connectors.repository.js';
import type { SyncRecovery } from '../sync/sync-recovery.js';
import type { SyncRunsRepository } from '../sync/sync-runs.repository.js';
import { FileImportService, IMPORT_LIMITS } from './file-import.service.js';
import type { StagedImportStore } from './staged-import.store.js';

const meta = {
  actor: { id: 'user-1', role: 'HR_SG' as const, homeEntityCode: 'SG01' as const },
  ip: null,
  userAgent: null,
  traceId: 'trace-1',
};

/** A CSV export with a header row and `rows` synthetic data rows. */
function csv(rows: number) {
  const lines = ['Staff ID'];
  for (let index = 1; index <= rows; index += 1) lines.push(`E${String(300_000 + index)}`);
  const buffer = Buffer.from(`${lines.join('\n')}\n`);
  return { originalname: 'export.csv', size: buffer.length, buffer };
}

/** The service with fakes around it: a file connector in `status`, and a sync running or not. */
function service({ status = 'ACTIVE', syncing = false } = {}) {
  const staged = {
    delete: vi.fn(() => Promise.resolve(true)),
    put: vi.fn(() => Promise.resolve()),
    summary: vi.fn(() => Promise.resolve(null)),
    deleteIfSame: vi.fn(() => Promise.resolve(true)),
  };
  const audit = { record: vi.fn(() => Promise.resolve()) };
  const connectors = {
    findById: vi.fn(() => Promise.resolve({ id: 'my-hr', type: 'FILE_IMPORT', status })),
    activateDraft: vi.fn(() => Promise.resolve(true)),
  };
  const imports = new FileImportService(
    connectors as unknown as ConnectorsRepository,
    { findActive: () => Promise.resolve(null) } as unknown as MappingConfigsRepository,
    new SampleFileReader(),
    new MappingEngine(new TransformerRegistry()),
    staged as unknown as StagedImportStore,
    {
      findActive: () => Promise.resolve(syncing ? { id: 'run-1' } : null),
    } as unknown as SyncRunsRepository,
    { settleIfOrphaned: () => Promise.resolve(false) } as unknown as SyncRecovery,
    audit as unknown as AuditLogService,
  );
  return { imports, staged, audit, connectors };
}

const audited = (audit: { record: ReturnType<typeof vi.fn> }) =>
  audit.record.mock.calls.map(([event]) => (event as { action: string }).action);

describe('FileImportService', () => {
  it.each(['DEPRECATED', 'DISABLED'])('takes no file for a %s connector', async (status) => {
    const { imports } = service({ status });
    await expect(imports.stage('my-hr', csv(1), undefined, meta)).rejects.toThrow(ConflictError);
    await expect(imports.stage('my-hr', csv(1), undefined, meta)).rejects.toThrow(
      `my-hr is ${status.toLowerCase()}, so it takes no file to import`,
    );
  });

  it('leaves the staged file as it is while a sync of the connector runs', async () => {
    const { imports, staged } = service({ syncing: true });
    await expect(imports.stage('my-hr', csv(1), undefined, meta)).rejects.toThrow(
      SyncInProgressError,
    );
    await expect(imports.discard('my-hr', meta)).rejects.toThrow(SyncInProgressError);
    expect(staged.delete).not.toHaveBeenCalled();
    expect(staged.put).not.toHaveBeenCalled();
  });

  it('after an apply, deletes only the file that apply read, and activates a draft', async () => {
    const { imports, staged, audit } = service({ status: 'DRAFT' });
    staged.deleteIfSame.mockResolvedValueOnce(false);
    await imports.afterApply('my-hr', 'b'.repeat(64), meta);
    expect(staged.deleteIfSame).toHaveBeenCalledWith('my-hr', 'b'.repeat(64));
    // Another file was staged meanwhile: it stays, and nothing says it was applied.
    expect(audited(audit)).toEqual(['connector.activated']);

    await imports.afterApply('my-hr', 'c'.repeat(64), meta);
    expect(audited(audit)).toEqual([
      'connector.activated',
      'connector.import.cleared',
      'connector.activated',
    ]);
  });

  it('reads a whole export of MAX_IMPORT_ROWS rows, and refuses one row more', async () => {
    const reader = new SampleFileReader();
    const full = await reader.read(csv(MAX_IMPORT_ROWS), undefined, IMPORT_LIMITS);
    expect(full.rows).toHaveLength(MAX_IMPORT_ROWS);
    const over = reader.read(csv(MAX_IMPORT_ROWS + 1), undefined, IMPORT_LIMITS);
    await expect(over).rejects.toThrow(ValidationFailedError);
    await expect(over).rejects.toMatchObject({
      details: [expect.objectContaining({ problem: 'TOO_MANY_ROWS', limit: MAX_IMPORT_ROWS })],
    });
  });
});
