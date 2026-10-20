import { z } from 'zod';

import { syncRunStatusSchema } from '../connectors/connector.js';
import { syncCountsSchema, syncModeSchema, syncStageSchema } from '../connectors/sync-run.js';

/**
 * Envelope for every Server-Sent Event on `/api/v1/events`. `type` selects the
 * payload shape; feature areas add their own event types and payload schemas.
 */
export const realtimeEventSchema = z.object({
  id: z.string(),
  type: z.string().regex(/^[a-z]+(\.[a-z-]+)+$/, 'dotted event type, e.g. sync.progress'),
  occurredAt: z.iso.datetime(),
  data: z.unknown(),
});

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

/** Event types published by the integration core (area 1). */
export const REALTIME_EVENTS = {
  syncProgress: 'sync.progress',
  syncCompleted: 'sync.run.completed',
  syncFailed: 'sync.run.failed',
  conflictDetected: 'conflict.detected',
  conflictResolved: 'conflict.resolved',
  mappingProposed: 'mapping.proposed',
  mappingApproved: 'mapping.approved',
} as const;

/**
 * Progress of one sync run. Like every live message it carries ids, status and
 * counts, never field values: the browser refetches details through the
 * masked REST endpoints (ADR 0008).
 */
export const syncProgressEventSchema = z.object({
  syncRunId: z.uuid(),
  connectorId: z.string(),
  mode: syncModeSchema,
  status: syncRunStatusSchema,
  stage: syncStageSchema.nullable(),
  progress: z.number().int().min(0).max(100),
  counts: syncCountsSchema,
});

export type SyncProgressEvent = z.infer<typeof syncProgressEventSchema>;

export const conflictEventSchema = z.object({
  conflictId: z.uuid(),
  employeeNo: z.string(),
  field: z.string(),
});

export type ConflictEvent = z.infer<typeof conflictEventSchema>;
