import type { SlaState, WorkflowInstanceStatus, WorkflowTaskStatus } from '@huitong/shared';

import type { StatusTone } from '@/components/common/status-badge';
import type { StatusMarkStatus } from '@/components/reactbits/status-mark';

/** Badge tone for each instance status (the label comes from workflows.json). */
export const INSTANCE_STATUS_TONE: Record<WorkflowInstanceStatus, StatusTone> = {
  RUNNING: 'info',
  WAITING: 'neutral',
  COMPLETED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

export const TASK_STATUS_TONE: Record<WorkflowTaskStatus, StatusTone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
  BLOCKED: 'danger',
  SKIPPED: 'neutral',
};

export const SLA_TONE: Record<SlaState, StatusTone> = {
  ON_TRACK: 'success',
  DUE_SOON: 'warning',
  OVERDUE: 'danger',
};

/** How a step's task status is drawn by the StatusMark; a step without a task is pending. */
export function stepMark(status: WorkflowTaskStatus | null): StatusMarkStatus {
  switch (status) {
    case 'IN_PROGRESS':
      return 'running';
    case 'DONE':
      return 'done';
    case 'BLOCKED':
      return 'failed';
    case 'SKIPPED':
      return 'cancelled';
    case 'PENDING':
    case null:
      return 'pending';
  }
}

const OPEN_TASK_STATUSES: ReadonlySet<WorkflowTaskStatus> = new Set([
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
]);

export function isOpenTask(status: WorkflowTaskStatus): boolean {
  return OPEN_TASK_STATUSES.has(status);
}
