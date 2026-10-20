import { z } from 'zod';

import { userRefSchema } from '../auth/user-ref.js';
import { employeeNoSchema } from '../employees/canonical-employee.js';
import { entityCodeSchema } from '../org/entities.js';
import { syncRunStatusSchema, syncTriggerSchema } from './connector.js';

/**
 * PREVIEW runs the whole pipeline but writes nothing, so HR sees what a sync
 * would change before it does (CLAUDE.md section 8, error prevention).
 * Scheduled, webhook and bootstrap syncs apply directly.
 */
export const SYNC_MODES = ['PREVIEW', 'APPLY'] as const;

export const syncModeSchema = z.enum(SYNC_MODES);

export type SyncMode = z.infer<typeof syncModeSchema>;

/** The Template Method steps of every sync. */
export const SYNC_STAGES = ['EXTRACT', 'MAP', 'VALIDATE', 'LOAD', 'AUDIT'] as const;

export const syncStageSchema = z.enum(SYNC_STAGES);

export type SyncStage = z.infer<typeof syncStageSchema>;

const count = z.number().int().min(0);

export const syncCountsSchema = z.object({
  fetched: count,
  created: count,
  updated: count,
  unchanged: count,
  conflicts: count,
  errors: count,
});

export type SyncCounts = z.infer<typeof syncCountsSchema>;

export const syncRunSchema = z.object({
  id: z.uuid(),
  connectorId: z.string(),
  trigger: syncTriggerSchema,
  mode: syncModeSchema,
  status: syncRunStatusSchema,
  stage: syncStageSchema.nullable(),
  /** 0 to 100. */
  progress: z.number().int().min(0).max(100),
  counts: syncCountsSchema,
  attempt: z.number().int().min(0),
  triggeredBy: userRefSchema.nullable(),
  mappingVersion: z.number().int().min(1).nullable(),
  queuedAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
});

export type SyncRun = z.infer<typeof syncRunSchema>;

export const SYNC_PREVIEW_KINDS = ['CREATE', 'UPDATE', 'CONFLICT'] as const;

export const syncPreviewKindSchema = z.enum(SYNC_PREVIEW_KINDS);

export type SyncPreviewKind = z.infer<typeof syncPreviewKindSchema>;

/** One change a previewed sync would make. Values are masked for the viewer like any other. */
export const syncPreviewItemSchema = z.object({
  employeeNo: employeeNoSchema,
  entityCode: entityCodeSchema,
  kind: syncPreviewKindSchema,
  /** Null for CREATE: the whole record is new. */
  field: z.string().nullable(),
  before: z.unknown(),
  after: z.unknown(),
});

export type SyncPreviewItem = z.infer<typeof syncPreviewItemSchema>;

export const syncErrorSchema = z.object({
  externalId: z.string().nullable(),
  stage: syncStageSchema,
  code: z.string(),
  message: z.string(),
});

export type SyncError = z.infer<typeof syncErrorSchema>;

/** The most preview items a run keeps; the counts always cover everything. */
export const MAX_PREVIEW_ITEMS = 200;

export const syncRunDetailSchema = syncRunSchema.extend({
  errors: z.array(syncErrorSchema),
  previewItems: z.array(syncPreviewItemSchema),
  previewTruncated: z.boolean(),
});

export type SyncRunDetail = z.infer<typeof syncRunDetailSchema>;

/** How long a preview stays valid for the APPLY that follows it. */
export const PREVIEW_VALID_MINUTES = 30;

/**
 * A manual APPLY must name the PREVIEW it follows (same connector, finished,
 * recent): the server enforces "preview before any sync writes data", not
 * only the UI.
 */
export const startSyncSchema = z.object({
  mode: syncModeSchema.default('PREVIEW'),
  previewRunId: z.uuid().optional(),
});

export type StartSyncRequest = z.infer<typeof startSyncSchema>;
