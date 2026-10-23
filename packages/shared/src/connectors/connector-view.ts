import { z } from 'zod';

import { entityCodeSchema } from '../org/entities.js';
import { mappingConfigSchema } from '../mapping/mapping-config.js';
import { connectorStatusSchema, connectorTypeSchema } from './connector.js';
import { stagedImportSchema } from './staged-import.js';
import { syncRunSchema } from './sync-run.js';

export const HEALTH_STATUSES = ['OK', 'FAILED'] as const;

export const healthStatusSchema = z.enum(HEALTH_STATUSES);

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const connectorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  nameZh: z.string(),
  type: connectorTypeSchema,
  region: z.string(),
  entityCode: entityCodeSchema.nullable(),
  status: connectorStatusSchema,
  /** A HuiTong mock stands in for the client's system; every screen that shows the connector says so. */
  isMock: z.boolean(),
  capabilities: z.array(z.string()),
  /** True when the connector can pull employees into the master now; a file connector needs a staged file. */
  syncable: z.boolean(),
  /** A file connector's staged file, waiting for its preview and apply; null for other connectors. */
  stagedImport: stagedImportSchema.nullable(),
  lastSyncAt: z.iso.datetime().nullable(),
  lastHealthCheckAt: z.iso.datetime().nullable(),
  lastHealthStatus: healthStatusSchema.nullable(),
  activeMappingVersion: z.number().int().min(1).nullable(),
  latestRun: syncRunSchema.nullable(),
});

export type ConnectorSummary = z.infer<typeof connectorSummarySchema>;

/** Settings are non-secret by design; credentials appear only as the name of where they are kept. */
export const connectorDetailSchema = connectorSummarySchema.extend({
  baseUrl: z.string().nullable(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  credentialsRef: z.string().nullable(),
  mappingConfigs: z.array(mappingConfigSchema),
});

export type ConnectorDetail = z.infer<typeof connectorDetailSchema>;

export const healthCheckResultSchema = z.object({
  status: healthStatusSchema,
  latencyMs: z.number().int().min(0),
  checkedAt: z.iso.datetime(),
  /** Already safe to show: no URLs with credentials, no stack traces. */
  message: z.string(),
});

export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
