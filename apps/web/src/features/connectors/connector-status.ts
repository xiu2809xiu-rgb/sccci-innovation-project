import type {
  ConnectorStatus,
  ConnectorSummary,
  ConnectorType,
  HealthStatus,
  SyncRunStatus,
} from '@huitong/shared';

import type { StatusTone } from '@/components/common/status-badge';

/** Badge tone for each connector status (the label comes from connectors.json). */
export const CONNECTOR_STATUS_TONE: Record<ConnectorStatus, StatusTone> = {
  ACTIVE: 'success',
  DEGRADED: 'warning',
  ERROR: 'danger',
  DISABLED: 'neutral',
  DEPRECATED: 'neutral',
  DRAFT: 'info',
};

export const RUN_STATUS_TONE: Record<SyncRunStatus, StatusTone> = {
  QUEUED: 'neutral',
  RUNNING: 'info',
  SUCCEEDED: 'success',
  PARTIAL: 'warning',
  FAILED: 'danger',
};

export const HEALTH_TONE: Record<HealthStatus, StatusTone> = {
  OK: 'success',
  FAILED: 'danger',
};

/** Types with a live endpoint to check; file imports and the mocked messaging tools have none. */
export function hasLiveEndpoint(type: ConnectorType): boolean {
  return type !== 'FILE_IMPORT' && type !== 'NOTIFICATION';
}

/**
 * Types that bring employee records in, so syncs and field mappings apply.
 * OA sends approval events and the messaging tools only receive.
 */
export function bringsEmployeeData(type: ConnectorType): boolean {
  return type !== 'OA_WEBHOOK' && type !== 'NOTIFICATION';
}

const STATUS_RANK: Record<ConnectorStatus, number> = {
  ACTIVE: 0,
  DEGRADED: 0,
  ERROR: 0,
  DRAFT: 1,
  DISABLED: 2,
  DEPRECATED: 3,
};

const TYPE_RANK: Record<ConnectorType, number> = {
  SG_HR_REST: 0,
  CN_HQ_SAP: 0,
  GENERIC_REST: 0,
  FILE_IMPORT: 0,
  OA_WEBHOOK: 1,
  NOTIFICATION: 2,
};

/**
 * The order people scan the list in: live systems before drafts and disabled
 * ones, the deprecated Excel master last; within each, the HR systems, then
 * OA, then messaging.
 */
export function inListOrder(connectors: readonly ConnectorSummary[]): ConnectorSummary[] {
  return [...connectors].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] || TYPE_RANK[a.type] - TYPE_RANK[b.type],
  );
}
