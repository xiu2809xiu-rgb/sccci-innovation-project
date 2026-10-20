import { z } from 'zod';

import { aiProviderSchema } from '../ai/usage.js';
import { paginationQuerySchema } from '../api/envelope.js';
import { localeSchema } from '../auth/session.js';
import { userRefSchema } from '../auth/user-ref.js';
import {
  classificationLevelSchema,
  EMPLOYEE_FIELDS,
  type EmployeeField,
} from '../governance/classification.js';
import { entityCodeSchema } from '../org/entities.js';
import { employeeNoSchema } from './canonical-employee.js';

// EMPLOYEE_FIELDS is built from the classification map's keys, so it is never empty.
export const employeeFieldSchema = z.enum(EMPLOYEE_FIELDS as [EmployeeField, ...EmployeeField[]]);

export const CONFLICT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;

export const conflictStatusSchema = z.enum(CONFLICT_STATUSES);

export type ConflictStatus = z.infer<typeof conflictStatusSchema>;

export const CONFLICT_RESOLUTIONS = ['SOURCE_SELECTED', 'MANUAL_VALUE'] as const;

export const conflictResolutionSchema = z.enum(CONFLICT_RESOLUTIONS);

export type ConflictResolution = z.infer<typeof conflictResolutionSchema>;

/** What one source held when the conflict was detected. `value` may be masked. */
export const conflictCandidateSchema = z.object({
  connectorId: z.string(),
  value: z.unknown(),
  observedAt: z.iso.datetime(),
});

export type ConflictCandidate = z.infer<typeof conflictCandidateSchema>;

export const conflictSchema = z.object({
  id: z.uuid(),
  employeeNo: employeeNoSchema,
  employeeName: z.string(),
  employeeNameLocal: z.string().nullable(),
  entityCode: entityCodeSchema,
  field: employeeFieldSchema,
  classification: classificationLevelSchema,
  status: conflictStatusSchema,
  candidates: z.array(conflictCandidateSchema),
  detectedAt: z.iso.datetime(),
  resolution: conflictResolutionSchema.nullable(),
  chosenConnectorId: z.string().nullable(),
  resolvedValue: z.unknown(),
  resolutionNote: z.string().nullable(),
  resolvedBy: userRefSchema.nullable(),
  resolvedAt: z.iso.datetime().nullable(),
});

export type Conflict = z.infer<typeof conflictSchema>;

export const conflictListQuerySchema = paginationQuerySchema.extend({
  status: conflictStatusSchema.default('OPEN'),
  entityCode: entityCodeSchema.optional(),
  field: employeeFieldSchema.optional(),
});

export type ConflictListQuery = z.infer<typeof conflictListQuerySchema>;

/**
 * HR's decision. Choosing a source makes it the record's source of truth for
 * the field from then on; a typed-in value needs a note explaining where it came from.
 */
export const resolveConflictSchema = z.discriminatedUnion('resolution', [
  z.object({
    resolution: z.literal('SOURCE_SELECTED'),
    connectorId: z.string().min(1).max(60),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    resolution: z.literal('MANUAL_VALUE'),
    value: z.unknown(),
    note: z.string().trim().min(3).max(500),
  }),
]);

export type ResolveConflictRequest = z.infer<typeof resolveConflictSchema>;

export const explainConflictSchema = z.object({
  language: localeSchema.default('en'),
});

export type ExplainConflictRequest = z.infer<typeof explainConflictSchema>;

/** The discrepancy explainer's answer: advice for HR, never applied to any record. */
export const conflictExplanationSchema = z.object({
  conflictId: z.uuid(),
  language: localeSchema,
  text: z.string(),
  provider: aiProviderSchema,
  model: z.string(),
  generatedAt: z.iso.datetime(),
});

export type ConflictExplanation = z.infer<typeof conflictExplanationSchema>;
