import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { employeeNoSchema } from '../employees/canonical-employee.js';
import { entityCodeSchema } from '../org/entities.js';

/** A month as `YYYY-MM`. */
export const reportPeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

/** Mirrors the Prisma enum `ConsolidationRunStatus`. NEEDS_REVIEW: done, with exceptions open. */
export const CONSOLIDATION_RUN_STATUSES = [
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'NEEDS_REVIEW',
  'FAILED',
] as const;

export const consolidationRunStatusSchema = z.enum(CONSOLIDATION_RUN_STATUSES);

export type ConsolidationRunStatus = z.infer<typeof consolidationRunStatusSchema>;

/**
 * What a consolidation flags for HR rather than guessing (story D-3). The UI
 * explains each type; `details` says where it came from.
 */
export const CONSOLIDATION_EXCEPTION_TYPES = [
  'UNMAPPED_CATEGORY',
  'NO_TEMPLATE_COLUMN',
  'LEAVE_PENDING',
  'OVERLAPPING_LEAVE',
  'LEAVE_ON_NON_WORKING_DAY',
  'UNKNOWN_EMPLOYEE',
  'TOTALS_MISMATCH',
] as const;

export const consolidationExceptionTypeSchema = z.enum(CONSOLIDATION_EXCEPTION_TYPES);

export type ConsolidationExceptionType = z.infer<typeof consolidationExceptionTypeSchema>;

export const consolidationExceptionSchema = z.object({
  id: z.string(),
  type: consolidationExceptionTypeSchema,
  employeeNo: employeeNoSchema.nullable(),
  employeeName: z.string().nullable(),
  entityCode: entityCodeSchema,
  /** Where the record came from, with the source system's own category code. */
  details: z.object({
    connectorId: z.string(),
    sourceRecordId: z.string().nullable(),
    sourceCategory: z.string().nullable(),
    /** The source system's own name for the category, e.g. 年假 or Annual Leave. */
    sourceLabel: z.string().nullable(),
    startDate: z.iso.date().nullable(),
    endDate: z.iso.date().nullable(),
    /** Working days of the record that fall in the run's month. */
    daysInPeriod: z.number().min(0).nullable(),
  }),
  resolved: z.boolean(),
  /** How HR settled it, once resolved. */
  resolution: z.string().nullable(),
});

export type ConsolidationException = z.infer<typeof consolidationExceptionSchema>;

/** Records one source system contributed to a run. */
export const consolidationSourceSchema = z.object({
  connectorId: z.string(),
  entityCode: entityCodeSchema,
  attendanceRows: z.number().int().min(0),
  leaveRecords: z.number().int().min(0),
});

export type ConsolidationSource = z.infer<typeof consolidationSourceSchema>;

export const consolidationRunSummarySchema = z.object({
  id: z.string(),
  period: reportPeriodSchema,
  entityCodes: z.array(entityCodeSchema).min(1),
  status: consolidationRunStatusSchema,
  employeeCount: z.number().int().min(0),
  recordCount: z.number().int().min(0),
  /** Every entity's, so the run's state is clear even when some are not shown. */
  exceptionCount: z.number().int().min(0),
  openExceptionCount: z.number().int().min(0),
  triggeredBy: z.string().nullable(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  /** True once the month can be exported in the company template. */
  exportable: z.boolean(),
});

export type ConsolidationRunSummary = z.infer<typeof consolidationRunSummarySchema>;

export const consolidationRunDetailSchema = consolidationRunSummarySchema.extend({
  sources: z.array(consolidationSourceSchema),
  /** The exceptions the caller may see: their own entity's (default deny, story B-7). */
  exceptions: z.array(consolidationExceptionSchema),
  /** Exceptions withheld because no transfer register entry shares them with the caller's entity. */
  withheldExceptionCount: z.number().int().min(0),
});

export type ConsolidationRunDetail = z.infer<typeof consolidationRunDetailSchema>;

export const consolidationRunListQuerySchema = paginationQuerySchema.extend({
  status: consolidationRunStatusSchema.optional(),
});

export type ConsolidationRunListQuery = z.infer<typeof consolidationRunListQuerySchema>;

/** Body of `POST /attendance-leave/runs`. */
export const startConsolidationSchema = z.object({
  period: reportPeriodSchema,
  entityCodes: z.array(entityCodeSchema).min(1),
});

export type StartConsolidation = z.infer<typeof startConsolidationSchema>;
