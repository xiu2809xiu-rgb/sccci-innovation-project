import type { ConnectorType, SyncError, SyncRunDetail } from '@huitong/shared';

import { isFinished } from '../../api/sync-runs';

export type SyncStage =
  | { kind: 'choose' }
  | { kind: 'preview'; connectorId: string; runId: string }
  | { kind: 'apply'; connectorId: string; runId: string };

/** Where the flow stands once a run settles, so the dialog never describes a step already past. */
export type SyncOutcome =
  | SyncStage['kind']
  | 'inSync'
  | 'nothingToApply'
  | 'allRecordsFailed'
  | 'applied'
  | 'partial'
  | 'previewFailed'
  | 'applyFailed';

const hasChanges = (run: SyncRunDetail) =>
  run.counts.created + run.counts.updated + run.counts.conflicts > 0;

/** The run's errors about single records, as opposed to one that stopped the whole run. */
export const recordErrorsOf = (run: SyncRunDetail): SyncError[] =>
  run.errors.filter((error) => error.externalId !== null);

export function outcomeOf(stage: SyncStage, run: SyncRunDetail | undefined): SyncOutcome {
  if (stage.kind === 'choose' || !run || !isFinished(run.status)) return stage.kind;
  if (run.status === 'FAILED') {
    // Each record failed on its own and nothing stopped the run: the records need correcting.
    const everyRecord = run.errors.length > 0 && recordErrorsOf(run).length === run.errors.length;
    if (stage.kind === 'preview' && everyRecord) return 'allRecordsFailed';
    return stage.kind === 'preview' ? 'previewFailed' : 'applyFailed';
  }
  if (stage.kind === 'apply') return run.status === 'PARTIAL' ? 'partial' : 'applied';
  if (hasChanges(run)) return 'preview';
  // Records that fail are skipped, not in sync: saying "in sync" would hide them.
  return run.counts.errors > 0 ? 'nothingToApply' : 'inSync';
}

/** The dialog's description of an outcome: a file connector is told to correct and stage its file again. */
export function descriptionOf(outcome: SyncOutcome, type: ConnectorType | undefined) {
  if (type === 'FILE_IMPORT' && outcome === 'allRecordsFailed') return 'allRecordsFailedFile';
  if (type === 'FILE_IMPORT' && outcome === 'nothingToApply') return 'nothingToApplyFile';
  return outcome;
}
