import type { ConnectorType } from '@huitong/shared';

import { noEmployees } from './connector-capability.error.js';
import type { ConnectorHealth, ExternalRecord, SystemConnector } from './system-connector.js';

const NOTES: Partial<Record<ConnectorType, string>> = {
  NOTIFICATION: 'Notifications are mocked in this proof of concept',
};

/**
 * Systems with no live link to check or pull from: the mocked notification
 * channels and generic REST placeholders. File imports have their own adapter.
 */
export class OfflineConnector implements SystemConnector {
  readonly canFetchEmployees = false;

  constructor(
    readonly connectorId: string,
    readonly type: ConnectorType,
  ) {}

  checkHealth(): Promise<ConnectorHealth> {
    return Promise.resolve({
      status: 'OK',
      latencyMs: 0,
      message: NOTES[this.type] ?? 'No live connection to check',
    });
  }

  fetchEmployees(): AsyncIterable<ExternalRecord[]> {
    return noEmployees(this.connectorId);
  }
}
