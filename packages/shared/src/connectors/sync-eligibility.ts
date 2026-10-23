import type { ConnectorStatus, ConnectorType } from './connector.js';

const LIVE_STATUSES: ReadonlySet<ConnectorStatus> = new Set(['ACTIVE', 'DEGRADED', 'ERROR']);

/**
 * Whether a connector in this status may sync, take a file to import or get a
 * new mapping version: a live one may, and so may a file connector still in
 * draft, which its first import activates. A disabled or deprecated connector
 * may not. The API and the pages follow this one rule.
 */
export function statusAllowsSync(type: ConnectorType, status: ConnectorStatus): boolean {
  return LIVE_STATUSES.has(status) || (type === 'FILE_IMPORT' && status === 'DRAFT');
}
