import { z } from 'zod';

import { leaveCategorySchema } from '../attendance-leave/leave-category.js';
import { reportPeriodSchema } from '../attendance-leave/consolidation.js';
import { entityCodeSchema } from '../org/entities.js';

/** A figure and the systems it was drawn from (story D-5: every figure names its sources). */
const sourced = <T extends z.ZodType>(value: T) =>
  z.object({ value, sources: z.array(z.string()).min(1) });

/** One entity's month: aggregates only, so no person is identified. */
export const entityMonthSchema = z.object({
  entityCode: entityCodeSchema,
  headcount: sourced(z.number().int().min(0)),
  workingDays: z.number().int().min(0),
  /** Days present as a share of the days expected, after leave and public holidays, 0 to 100. */
  attendanceRate: sourced(z.number().min(0).max(100)),
  overtimeHours: sourced(z.number().min(0)),
  leaveDays: z.array(
    z.object({
      category: leaveCategorySchema,
      days: z.number().min(0),
      sources: z.array(z.string()),
    }),
  ),
});

export type EntityMonth = z.infer<typeof entityMonthSchema>;

/** The management report for one month, read-only for MANAGEMENT. */
export const managementReportSchema = z.object({
  period: reportPeriodSchema,
  generatedAt: z.iso.datetime(),
  entities: z.array(entityMonthSchema),
});

export type ManagementReport = z.infer<typeof managementReportSchema>;

export const managementReportQuerySchema = z.object({
  period: reportPeriodSchema,
});

export type ManagementReportQuery = z.infer<typeof managementReportQuerySchema>;
