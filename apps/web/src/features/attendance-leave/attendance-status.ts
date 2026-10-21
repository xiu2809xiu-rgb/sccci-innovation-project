import type { ConsolidationRunStatus, MappingRuleStatus } from '@huitong/shared';

import type { StatusTone } from '@/components/common/status-badge';

/** Badge tone for each run status (the label comes from attendance-leave.json). */
export const RUN_STATUS_TONE: Record<ConsolidationRunStatus, StatusTone> = {
  QUEUED: 'neutral',
  RUNNING: 'info',
  SUCCEEDED: 'success',
  NEEDS_REVIEW: 'warning',
  FAILED: 'danger',
};

export const RULE_STATUS_TONE: Record<MappingRuleStatus, StatusTone> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
};
