import type { ConnectorStatus, SyncRunStatus } from '@huitong/shared';

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
