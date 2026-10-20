import { EMPLOYEE_FIELDS, type EmployeeField, type SyncRunStatus } from '@huitong/shared';
import {
  Activity,
  CircleCheck,
  CircleX,
  GitCompareArrows,
  Globe,
  RefreshCw,
  Sparkles,
  UserPen,
  type LucideIcon,
} from 'lucide-react';

export type ActivityLabel =
  | 'syncCompleted'
  | 'syncFailed'
  | 'conflictDetected'
  | 'conflictResolved'
  | 'mappingProposed'
  | 'mappingApproved'
  | 'employeeUpdated'
  | 'transferApproved'
  | 'other';

/**
 * Audit actions shown in the activity feed, with their label and icon. Areas
 * that add business events add a line here (and the label in overview.json).
 */
const ACTIVITY: Record<string, { label: ActivityLabel; icon: LucideIcon }> = {
  'sync.run.completed': { label: 'syncCompleted', icon: RefreshCw },
  'sync.run.failed': { label: 'syncFailed', icon: CircleX },
  'conflict.detected': { label: 'conflictDetected', icon: GitCompareArrows },
  'conflict.resolved': { label: 'conflictResolved', icon: CircleCheck },
  'mapping.proposed': { label: 'mappingProposed', icon: Sparkles },
  'mapping.approved': { label: 'mappingApproved', icon: CircleCheck },
  'employee.updated': { label: 'employeeUpdated', icon: UserPen },
  'transfer.approved': { label: 'transferApproved', icon: Globe },
};

export function activityPresentation(action: string): { label: ActivityLabel; icon: LucideIcon } {
  return ACTIVITY[action] ?? { label: 'other', icon: Activity };
}

/** True when `field` names a canonical employee field (so it has a translated label). */
export function isEmployeeField(field: string): field is EmployeeField {
  return (EMPLOYEE_FIELDS as readonly string[]).includes(field);
}

/** Bar colour and height: worse outcomes are also shorter, so the strip does not rely on colour alone. */
export const RUN_BAR: Record<SyncRunStatus, string> = {
  SUCCEEDED: 'h-6 bg-success',
  PARTIAL: 'h-4 bg-warning',
  FAILED: 'h-2 bg-danger',
  RUNNING: 'h-6 animate-pulse bg-info',
  QUEUED: 'h-6 bg-info/50',
};
