import { ImportFileMissingError } from '../../../common/errors/app-error.js';
import { decodeCell } from '../imports/staged-rows.js';
import type { StagedImportStore } from '../imports/staged-import.store.js';
import type { ConnectorHealth, ExternalRecord, SystemConnector } from './system-connector.js';

/**
 * A file connector (an HR export, or the Excel master): its employees are the
 * rows of the file HR staged for it, already minimised by the staging step.
 * The sync pipeline reads them like any other source, so a file goes through
 * the same preview, apply, change digest and audit as a live system.
 */
export class FileImportConnector implements SystemConnector {
  readonly type = 'FILE_IMPORT' as const;
  readonly canFetchEmployees = true;
  private readFile: string | null = null;

  constructor(
    readonly connectorId: string,
    private readonly staged: StagedImportStore,
  ) {}

  /** The SHA-256 of the staged file the last fetch read. */
  get sourceVersion(): string | null {
    return this.readFile;
  }

  checkHealth(): Promise<ConnectorHealth> {
    return Promise.resolve({
      status: 'OK',
      latencyMs: 0,
      message: 'No live connection: files are imported by hand',
    });
  }

  async *fetchEmployees(): AsyncIterable<ExternalRecord[]> {
    const stored = await this.staged.get(this.connectorId);
    if (!stored) throw new ImportFileMissingError(this.connectorId);
    this.readFile = stored.sha256;
    yield stored.records.map((record) => ({
      externalId: record.externalId,
      payload: Object.fromEntries(
        Object.entries(record.payload).map(([column, cell]) => [column, decodeCell(cell)]),
      ),
    }));
  }
}
