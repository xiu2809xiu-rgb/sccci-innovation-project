import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { entityCodeSchema } from '../org/entities.js';
import { reportPeriodSchema } from './consolidation.js';

/** A column of the company's reporting template, in both languages. */
export const reportTemplateColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  labelZh: z.string(),
});

export type ReportTemplateColumn = z.infer<typeof reportTemplateColumnSchema>;

/** The active version of a reporting template (seeded; structure assumed until the client shares theirs, A-09). */
export const reportTemplateSchema = z.object({
  key: z.string(),
  version: z.number().int().min(1),
  name: z.string(),
  nameZh: z.string(),
  columns: z.array(reportTemplateColumnSchema).min(1),
});

export type ReportTemplate = z.infer<typeof reportTemplateSchema>;

/** One employee's row in the template; values are keyed by column, empty when nothing applies. */
export const templatePreviewRowSchema = z.object({
  employeeNo: z.string(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  /** Open exceptions on this row; the row is not final until they are settled. */
  exceptionCount: z.number().int().min(0),
});

export type TemplatePreviewRow = z.infer<typeof templatePreviewRowSchema>;

/** A month rendered in the template, before any export (preview before export, CLAUDE.md section 8). */
export const templatePreviewSchema = z.object({
  template: reportTemplateSchema,
  period: reportPeriodSchema,
  /** The caller's entity: its rows only, unless a transfer entry shares another's (story B-7). */
  entityCode: entityCodeSchema,
  rows: z.array(templatePreviewRowSchema),
  total: z.number().int().min(0),
});

export type TemplatePreview = z.infer<typeof templatePreviewSchema>;

export const templatePreviewQuerySchema = paginationQuerySchema.extend({
  period: reportPeriodSchema,
});

export type TemplatePreviewQuery = z.infer<typeof templatePreviewQuerySchema>;
