import type { SyncPreviewItem, SyncRun, SyncRunDetail } from '@huitong/shared';

import type { AuthenticatedUser } from '../../../common/http/authenticated-user.js';
import type {
  SyncRun as SyncRunRow,
  SyncError as SyncErrorRow,
} from '../../../generated/prisma/client.js';
import type { FieldMasker } from '../../access/field-masker.js';

/** Display names and mapping versions a list of runs refers to. */
export interface RunReferences {
  people: ReadonlyMap<string, string>;
  versions: ReadonlyMap<string, number>;
}

export function syncRunView(run: SyncRunRow, refs: RunReferences): SyncRun {
  const triggeredBy = run.triggeredByUserId;
  return {
    id: run.id,
    connectorId: run.connectorId,
    trigger: run.trigger,
    mode: run.mode,
    status: run.status,
    stage: run.stage,
    progress: run.progress,
    counts: {
      fetched: run.fetchedCount,
      created: run.createdCount,
      updated: run.updatedCount,
      unchanged: run.unchangedCount,
      conflicts: run.conflictCount,
      errors: run.errorCount,
    },
    attempt: run.attempt,
    triggeredBy: triggeredBy
      ? { id: triggeredBy, displayName: refs.people.get(triggeredBy) ?? '' }
      : null,
    mappingVersion: run.mappingConfigId ? (refs.versions.get(run.mappingConfigId) ?? null) : null,
    queuedAt: run.queuedAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}

/** A preview item with its values masked for the viewer, like any other employee data. */
function maskedPreview(
  item: SyncPreviewItem,
  viewer: AuthenticatedUser,
  masker: FieldMasker,
): SyncPreviewItem {
  if (item.field === null) return item;
  const field = item.field;
  const entity = item.entityCode;
  const after = Array.isArray(item.after)
    ? (item.after as { connectorId: string; value: unknown }[]).map((candidate) => ({
        connectorId: candidate.connectorId,
        value: masker.value(field, candidate.value, viewer, entity),
      }))
    : masker.value(field, item.after, viewer, entity);
  return { ...item, before: masker.value(field, item.before, viewer, entity), after };
}

export function syncRunDetailView(
  run: SyncRunRow & { errors: SyncErrorRow[] },
  refs: RunReferences,
  viewer: AuthenticatedUser,
  masker: FieldMasker,
): SyncRunDetail {
  const preview = Array.isArray(run.previewItems)
    ? (run.previewItems as unknown as SyncPreviewItem[])
    : [];
  return {
    ...syncRunView(run, refs),
    errors: run.errors.map((error) => ({
      externalId: error.externalId,
      stage: error.stage,
      code: error.code,
      message: error.message,
    })),
    previewItems: preview.map((item) => maskedPreview(item, viewer, masker)),
    previewTruncated: run.previewTruncated,
  };
}
