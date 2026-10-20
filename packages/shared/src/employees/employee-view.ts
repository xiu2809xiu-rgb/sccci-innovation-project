import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { userRefSchema } from '../auth/user-ref.js';
import { classificationLevelSchema } from '../governance/classification.js';
import { departmentCodeSchema } from '../org/departments.js';
import { entityCodeSchema } from '../org/entities.js';
import { workLocationSchema } from '../org/work-locations.js';
import { employeeNoSchema } from './canonical-employee.js';
import { conflictSchema, employeeFieldSchema } from './conflict.js';
import { employmentStatusSchema } from './employment.js';

export const EMPLOYEE_SORTS = ['name', 'employeeNo', 'department', 'hireDate'] as const;

export const employeeListQuerySchema = paginationQuerySchema.extend({
  /** Matches the employee number, either name or the work email. */
  q: z.string().trim().max(100).optional(),
  entityCode: entityCodeSchema.optional(),
  departmentCode: departmentCodeSchema.optional(),
  employmentStatus: employmentStatusSchema.optional(),
  /** `open` keeps only employees with at least one open conflict. */
  conflicts: z.literal('open').optional(),
  sort: z.enum(EMPLOYEE_SORTS).default('name'),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;

/** A row of the employee list: INTERNAL fields only, so no role sees a mask here. */
export const employeeSummarySchema = z.object({
  employeeNo: employeeNoSchema,
  entityCode: entityCodeSchema,
  fullNameLatin: z.string(),
  fullNameLocal: z.string().nullable(),
  preferredName: z.string().nullable(),
  workEmail: z.string(),
  departmentCode: departmentCodeSchema,
  jobTitle: z.string(),
  jobTitleZh: z.string().nullable(),
  employmentStatus: employmentStatusSchema,
  workLocation: workLocationSchema,
  openConflictCount: z.number().int().min(0),
  /** Connector ids that hold this person. */
  sources: z.array(z.string()),
  updatedAt: z.iso.datetime(),
});

export type EmployeeSummary = z.infer<typeof employeeSummarySchema>;

/**
 * Why the master holds the value it does. POLICY: the field's owner for the
 * entity. HR_DECISION: HR chose this source when resolving a conflict. NONE: no
 * single owner, so disagreements open a conflict.
 */
export const SOURCE_OF_TRUTH_KINDS = ['POLICY', 'HR_DECISION', 'NONE'] as const;

export const sourceOfTruthSchema = z.object({
  kind: z.enum(SOURCE_OF_TRUTH_KINDS),
  connectorId: z.string().nullable(),
});

export type SourceOfTruth = z.infer<typeof sourceOfTruthSchema>;

/** One field of a record, beside what each source holds. Values may be masked. */
export const employeeFieldViewSchema = z.object({
  field: employeeFieldSchema,
  classification: classificationLevelSchema,
  value: z.unknown(),
  sourceOfTruth: sourceOfTruthSchema,
  sources: z.array(
    z.object({
      connectorId: z.string(),
      value: z.unknown(),
      observedAt: z.iso.datetime(),
      /** Whether this source holds the same value as the master. */
      agrees: z.boolean(),
    }),
  ),
  openConflictId: z.uuid().nullable(),
});

export type EmployeeFieldView = z.infer<typeof employeeFieldViewSchema>;

export const CHANGE_SOURCES = ['SYNC', 'CONFLICT_RESOLUTION', 'MANUAL', 'WORKFLOW'] as const;

export const employeeChangeSchema = z.object({
  id: z.uuid(),
  field: employeeFieldSchema,
  oldValue: z.unknown(),
  newValue: z.unknown(),
  source: z.enum(CHANGE_SOURCES),
  connectorId: z.string().nullable(),
  syncRunId: z.uuid().nullable(),
  actor: userRefSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export type EmployeeChange = z.infer<typeof employeeChangeSchema>;

/** The record drawer: the master, every source side by side, conflicts and history. */
export const employeeDetailSchema = z.object({
  employeeNo: employeeNoSchema,
  entityCode: entityCodeSchema,
  fullNameLatin: z.string(),
  fullNameLocal: z.string().nullable(),
  version: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  fields: z.array(employeeFieldViewSchema),
  conflicts: z.array(conflictSchema),
  history: z.array(employeeChangeSchema),
});

export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;
