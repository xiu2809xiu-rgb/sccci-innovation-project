import { z } from 'zod';

import { roleSchema } from '../auth/roles.js';
import {
  connectorStatusSchema,
  connectorTypeSchema,
  syncRunStatusSchema,
  syncTriggerSchema,
} from '../connectors/connector.js';
import { entityCodeSchema } from '../org/entities.js';

/** How many recent runs each connector reports (one status bar per run on the overview). */
export const OVERVIEW_RECENT_RUNS = 14;

export const recentSyncRunSchema = z.object({
  id: z.string(),
  status: syncRunStatusSchema,
  trigger: syncTriggerSchema,
  queuedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  conflictCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
});

export type RecentSyncRun = z.infer<typeof recentSyncRunSchema>;

export const connectorHealthSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameZh: z.string(),
  type: connectorTypeSchema,
  status: connectorStatusSchema,
  /** A HuiTong mock stands in for the client's system. */
  isMock: z.boolean(),
  region: z.string(),
  lastSyncAt: z.iso.datetime().nullable(),
  /** Newest first. */
  recentRuns: z.array(recentSyncRunSchema),
});

export type ConnectorHealth = z.infer<typeof connectorHealthSchema>;

/**
 * Work waiting for the caller. A count is null when the caller's role may not
 * act on that kind of item, so the overview never shows queues you cannot clear.
 */
export const pendingApprovalsSchema = z.object({
  mappingProposals: z.number().int().min(0).nullable(),
  conflicts: z.number().int().min(0).nullable(),
  crossBorderTransfers: z.number().int().min(0).nullable(),
  workflowTasks: z.number().int().min(0).nullable(),
});

export type PendingApprovals = z.infer<typeof pendingApprovalsSchema>;

export const openConflictSummarySchema = z.object({
  id: z.string(),
  employeeNo: z.string(),
  employeeName: z.string(),
  employeeNameLocal: z.string().nullable(),
  entityCode: entityCodeSchema,
  /** Canonical field name, e.g. `jobTitle`. */
  field: z.string(),
  detectedAt: z.iso.datetime(),
});

export type OpenConflictSummary = z.infer<typeof openConflictSummarySchema>;

/** A business event from the audit log (sign-in events are left out of the feed). */
export const activityItemSchema = z.object({
  id: z.string(),
  occurredAt: z.iso.datetime(),
  action: z.string(),
  actorName: z.string().nullable(),
  actorRole: roleSchema.nullable(),
  entityType: z.string(),
  entityId: z.string().nullable(),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

export const overviewSchema = z.object({
  generatedAt: z.iso.datetime(),
  kpis: z.object({
    employees: z.object({
      total: z.number().int().min(0),
      byEntity: z.array(z.object({ entityCode: entityCodeSchema, count: z.number().int().min(0) })),
    }),
    /** Share of employees in the master with no open conflict; null while the master is empty. */
    consistencyRate: z.number().min(0).max(1).nullable(),
    openConflicts: z.number().int().min(0),
    connectors: z.object({ healthy: z.number().int().min(0), total: z.number().int().min(0) }),
  }),
  connectors: z.array(connectorHealthSchema),
  pendingApprovals: pendingApprovalsSchema,
  recentConflicts: z.array(openConflictSummarySchema),
  activity: z.array(activityItemSchema),
});

export type Overview = z.infer<typeof overviewSchema>;
