import { z } from 'zod';

import { prohibitedKindSchema } from '../mapping/mapping-proposal.js';

/** How long a staged file waits for its preview and apply before it is deleted. */
export const STAGED_IMPORT_TTL_MINUTES = 60;

/** The largest file a file connector imports in one go. */
export const MAX_IMPORT_BYTES = 5_000_000;

/** The most data rows one import reads. */
export const MAX_IMPORT_ROWS = 20_000;

/** How many rejected rows a summary lists; the count covers the rest. */
export const MAX_REJECTED_ROWS_LISTED = 100;

/**
 * Why a row of the file cannot be imported. A row whose cells do not line up
 * with the headers (an unquoted comma, a lost separator) is left out rather
 * than read with its cells shifted; a row with a value shaped like a national
 * ID number is left out so the number is never stored; a date cell outside the
 * years 1 to 9999 cannot be a real date.
 */
export const REJECTED_ROW_REASONS = [
  'NO_EMPLOYEE_NUMBER',
  'INVALID_EMPLOYEE_NUMBER',
  'DUPLICATE_EMPLOYEE_NUMBER',
  'NATIONAL_ID_VALUE',
  'EXTRA_CELLS',
  'MISSING_CELLS',
  'INVALID_DATE',
] as const;

/** Why a column of the file is not kept: never stored at all, or not read by the mapping. */
export const DROPPED_COLUMN_REASONS = ['PROHIBITED', 'NOT_MAPPED'] as const;

/**
 * A file staged for import into a file connector, as HR sees it before the
 * preview: no cell values, only what was kept, what was left out and why.
 */
export const stagedImportSchema = z.object({
  connectorId: z.string(),
  fileName: z.string(),
  /** Data rows that will go through the preview. */
  rowCount: z.number().int().min(0),
  /** How many rows were left out. */
  rejectedCount: z.number().int().min(0),
  /**
   * The first MAX_REJECTED_ROWS_LISTED rows left out, by the line each starts
   * on in the file (blank lines counted). Never their values.
   */
  rejectedRows: z
    .array(z.object({ line: z.number().int().min(2), reason: z.enum(REJECTED_ROW_REASONS) }))
    .max(MAX_REJECTED_ROWS_LISTED),
  /** Columns not kept: national-ID or gender columns, and columns the mapping does not read. */
  droppedColumns: z.array(z.object({ header: z.string(), reason: z.enum(DROPPED_COLUMN_REASONS) })),
  mappingVersion: z.number().int().min(1),
  stagedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export type StagedImport = z.infer<typeof stagedImportSchema>;

/**
 * Why a whole file is refused when it is read or staged. The API sends it in
 * the error's details, so the UI can say it in either language and name the
 * columns or the limit.
 */
export const importProblemSchema = z.discriminatedUnion('problem', [
  z.object({ problem: z.literal('COLUMNS_MISSING'), columns: z.array(z.string()).min(1) }),
  z.object({
    problem: z.literal('PROHIBITED_COLUMN'),
    column: z.string(),
    kind: prohibitedKindSchema,
  }),
  /** No row could be kept: how many rows each reason left out, and the first line of each. */
  z.object({
    problem: z.literal('NO_ROWS_KEPT'),
    reasons: z
      .array(
        z.object({
          reason: z.enum(REJECTED_ROW_REASONS),
          count: z.number().int().positive(),
          firstLine: z.number().int().min(2),
        }),
      )
      .min(1),
  }),
  z.object({ problem: z.literal('FILE_TOO_LARGE'), megabytes: z.number().positive() }),
  z.object({ problem: z.literal('WORKBOOK_TOO_LARGE'), megabytes: z.number().positive() }),
  z.object({ problem: z.literal('TOO_MANY_ROWS'), limit: z.number().int().positive() }),
  z.object({ problem: z.literal('TOO_MANY_COLUMNS'), limit: z.number().int().positive() }),
  z.object({ problem: z.literal('UNSUPPORTED_TYPE') }),
  z.object({ problem: z.literal('UNREADABLE') }),
  z.object({ problem: z.literal('NO_HEADER_ROW') }),
  z.object({ problem: z.literal('UNNAMED_COLUMN') }),
  z.object({ problem: z.literal('HEADER_TOO_LONG'), limit: z.number().int().positive() }),
  z.object({ problem: z.literal('DUPLICATE_HEADER'), column: z.string() }),
  z.object({ problem: z.literal('NO_DATA') }),
]);

export type ImportProblem = z.infer<typeof importProblemSchema>;
