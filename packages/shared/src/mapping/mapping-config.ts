import { z } from 'zod';

import { userRefSchema } from '../auth/user-ref.js';
import { fieldMappingSchema } from './field-mapping.js';

export const MAPPING_CONFIG_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export const mappingConfigStatusSchema = z.enum(MAPPING_CONFIG_STATUSES);

export type MappingConfigStatus = z.infer<typeof mappingConfigStatusSchema>;

/** One version of a connector's field mapping. Only an approved version is ever ACTIVE. */
export const mappingConfigSchema = z.object({
  id: z.uuid(),
  connectorId: z.string(),
  version: z.number().int().min(1),
  status: mappingConfigStatusSchema,
  mappings: z.array(fieldMappingSchema),
  notes: z.string().nullable(),
  approvedBy: userRefSchema.nullable(),
  approvedAt: z.iso.datetime().nullable(),
  proposalId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

export type MappingConfig = z.infer<typeof mappingConfigSchema>;
