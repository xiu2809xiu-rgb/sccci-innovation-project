import { z } from 'zod';

/** Adapter families behind the `SystemConnector` interface (facts sheet section 7). */
export const CONNECTOR_TYPES = [
  'SG_HR_REST',
  'CN_HQ_SAP',
  'OA_WEBHOOK',
  'FILE_IMPORT',
  'NOTIFICATION',
  'GENERIC_REST',
] as const;

export const connectorTypeSchema = z.enum(CONNECTOR_TYPES);

export type ConnectorType = z.infer<typeof connectorTypeSchema>;

/** DEPRECATED marks a system being phased out (the Excel master); DRAFT is configured but not live. */
export const CONNECTOR_STATUSES = [
  'ACTIVE',
  'DEGRADED',
  'ERROR',
  'DISABLED',
  'DEPRECATED',
  'DRAFT',
] as const;

export const connectorStatusSchema = z.enum(CONNECTOR_STATUSES);

export type ConnectorStatus = z.infer<typeof connectorStatusSchema>;

/** Connectors that count towards platform health (deprecated, disabled and draft ones do not). */
export const LIVE_CONNECTOR_STATUSES: readonly ConnectorStatus[] = ['ACTIVE', 'DEGRADED', 'ERROR'];

export const SYNC_RUN_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED'] as const;

export const syncRunStatusSchema = z.enum(SYNC_RUN_STATUSES);

export type SyncRunStatus = z.infer<typeof syncRunStatusSchema>;

export const SYNC_TRIGGERS = ['MANUAL', 'SCHEDULED', 'WEBHOOK', 'BOOTSTRAP'] as const;

export const syncTriggerSchema = z.enum(SYNC_TRIGGERS);

export type SyncTrigger = z.infer<typeof syncTriggerSchema>;
