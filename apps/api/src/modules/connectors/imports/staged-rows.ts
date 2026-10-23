import { employeeNoSchema, type FieldMapping, type StagedImport } from '@huitong/shared';

import type { MappingEngine } from '../../mapping/mapping-engine.js';
import { refuseFile } from '../../mapping/proposals/file-refusal.js';
import {
  checkProhibited,
  looksLikeNationalId,
} from '../../mapping/proposals/prohibited-columns.js';
import type { RowInfo, SampleFile } from '../../mapping/proposals/sample-file-reader.js';
import { maskAccountNumber } from '../adapters/minimise.js';

/** A cell as JSON can hold it, with a spreadsheet's date cells kept apart as dates. */
export type StagedCell = string | number | null | { $date: string };

/** One row of a staged file: its employee number, and the cells the mapping reads. */
export interface StagedRecord {
  externalId: string;
  payload: Record<string, StagedCell>;
}

export interface StagingResult {
  records: StagedRecord[];
  rejectedRows: StagedImport['rejectedRows'];
  droppedColumns: StagedImport['droppedColumns'];
}

type RejectedReason = StagedImport['rejectedRows'][number]['reason'];

/** The columns a mapping reads: each field mapping's source, and every column its rules compare. */
export function columnsRead(mappings: readonly FieldMapping[]): Set<string> {
  const columns = new Set<string>();
  for (const mapping of mappings) {
    if (mapping.source !== null) columns.add(mapping.source);
    if (mapping.transform.kind === 'rules') {
      for (const rule of mapping.transform.rules) {
        for (const column of Object.keys(rule.when)) columns.add(column);
      }
    }
  }
  return columns;
}

/**
 * Columns whose values are cut to their last four digits before they are
 * stored: every source of the bank account field, whatever transform the
 * mapping gives it, and any column a mapping already cuts that way.
 */
function accountColumns(mappings: readonly FieldMapping[]): Set<string> {
  return new Set(
    mappings.flatMap((m) =>
      m.source !== null &&
      (m.target === 'bankAccountLast4' || m.transform.kind === 'last-four-digits')
        ? [m.source]
        : [],
    ),
  );
}

/**
 * Phone columns, whose values are not checked for the MyKad shape: a
 * Malaysian number with its country code has the same twelve digits. The
 * other national ID shapes, and the header, are still checked.
 */
function phoneColumns(mappings: readonly FieldMapping[]): Set<string> {
  return new Set(
    mappings.flatMap((m) => (m.source !== null && m.transform.kind === 'phone' ? [m.source] : [])),
  );
}

/** A date cell outside the years 1 to 9999, such as a number typed into a date-formatted cell. */
function impossibleDate(value: unknown): boolean {
  if (!(value instanceof Date)) return false;
  const year = value.getUTCFullYear();
  return Number.isNaN(value.getTime()) || year < 1 || year > 9999;
}

function encode(value: unknown): StagedCell {
  // An impossible date leaves its row out (INVALID_DATE), so it is never stored.
  if (value instanceof Date) return impossibleDate(value) ? null : { $date: value.toISOString() };
  if (typeof value === 'string' || typeof value === 'number') return value;
  return null;
}

function present(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== 'string' || value.trim() !== '';
}

/** Turns a staged cell back into what the reader produced, so the mapping sees the same values. */
export function decodeCell(cell: StagedCell): unknown {
  return cell !== null && typeof cell === 'object' ? new Date(cell.$date) : cell;
}

/**
 * Prepares a whole file for import through a connector's approved mapping, and
 * minimises it before anything is stored:
 * - a column the mapping reads but the file lacks, or a mapped column that
 *   holds national ID numbers or gender, refuses the whole file;
 * - every other column the mapping does not read is left out, and a
 *   national-ID or gender column is never kept, whatever its header;
 * - a bank account number is cut to its last four digits, so the full number
 *   is never stored;
 * - a row is left out, and reported by its line, never by its values, when
 *   its cells do not line up with the headers, a cell the mapping reads has
 *   the shape of a national ID number or holds an impossible date, or its
 *   employee number is missing, malformed or already used by an earlier row.
 */
export function stageRows(
  file: SampleFile,
  mappings: readonly FieldMapping[],
  engine: MappingEngine,
): StagingResult {
  const read = columnsRead(mappings);
  const missing = [...read].filter((column) => !file.headers.includes(column));
  if (missing.length > 0) {
    refuseFile(
      { problem: 'COLUMNS_MISSING', columns: missing },
      `The file has no column ${missing.map((c) => `"${c}"`).join(', ')}, which the mapping reads`,
    );
  }

  const phones = phoneColumns(mappings);
  const accounts = accountColumns(mappings);
  const droppedColumns: StagedImport['droppedColumns'] = [];
  for (const header of file.headers) {
    // An account column is judged by its header: a 12- or 18-digit account number has an ID's shape.
    const check = checkProhibited(
      header,
      accounts.has(header) ? [] : file.rows.map((row) => row[header]),
      { phone: phones.has(header) },
    );
    if (check.prohibited && read.has(header)) {
      const kind = check.kind ?? 'NATIONAL_ID';
      refuseFile(
        { problem: 'PROHIBITED_COLUMN', column: header, kind },
        `The column "${header}" holds ${kind === 'GENDER' ? 'gender' : 'national ID numbers'}, which HuiTong never imports`,
      );
    }
    if (check.prohibited) droppedColumns.push({ header, reason: 'PROHIBITED' });
    else if (!read.has(header)) droppedColumns.push({ header, reason: 'NOT_MAPPED' });
  }

  const numberMapping = mappings.filter((m) => m.target === 'employeeNo');
  const numberSource = numberMapping[0]?.source ?? null;
  const seen = new Set<string>();
  const records: StagedRecord[] = [];
  const rejectedRows: StagedImport['rejectedRows'] = [];
  for (const [index, row] of file.rows.entries()) {
    const info = file.rowInfo[index] ?? { line: index + 2, cells: 'match' };
    const payload = Object.fromEntries(
      [...read].map((column) => [
        column,
        encode(accounts.has(column) ? maskAccountNumber(row[column]) : row[column]),
      ]),
    );
    const verdict = verdictOf({
      cells: info.cells,
      idShaped: Object.entries(payload).some(([column, value]) =>
        looksLikeNationalId(value, { phone: phones.has(column) }),
      ),
      badDate: [...read].some((column) => impossibleDate(row[column])),
      employeeNo: engine.map(row, numberMapping).values.employeeNo,
      numberGiven: numberSource !== null && present(row[numberSource]),
      seen,
    });
    if (!verdict.ok) {
      rejectedRows.push({ line: info.line, reason: verdict.reason });
      continue;
    }
    seen.add(verdict.employeeNo);
    records.push({ externalId: verdict.employeeNo, payload });
  }
  return { records, rejectedRows, droppedColumns };
}

/** How many rows each reason left out, and the first line of each, in the order the reasons first appear. */
export function rejectionsByReason(
  rejectedRows: StagingResult['rejectedRows'],
): { reason: RejectedReason; count: number; firstLine: number }[] {
  const byReason = new Map<
    RejectedReason,
    { reason: RejectedReason; count: number; firstLine: number }
  >();
  for (const { reason, line } of rejectedRows) {
    const entry = byReason.get(reason);
    if (entry) entry.count += 1;
    else byReason.set(reason, { reason, count: 1, firstLine: line });
  }
  return [...byReason.values()];
}

type RowVerdict = { ok: true; employeeNo: string } | { ok: false; reason: RejectedReason };

/** Whether a row can be staged, checked in the order HR would fix them. */
function verdictOf(row: {
  cells: RowInfo['cells'];
  idShaped: boolean;
  badDate: boolean;
  employeeNo: unknown;
  /** The employee number's cell holds something, usable or not. */
  numberGiven: boolean;
  seen: ReadonlySet<string>;
}): RowVerdict {
  if (row.cells === 'extra') return { ok: false, reason: 'EXTRA_CELLS' };
  if (row.cells === 'missing') return { ok: false, reason: 'MISSING_CELLS' };
  if (row.idShaped) return { ok: false, reason: 'NATIONAL_ID_VALUE' };
  if (row.badDate) return { ok: false, reason: 'INVALID_DATE' };
  const { employeeNo } = row;
  if (typeof employeeNo !== 'string' || !employeeNoSchema.safeParse(employeeNo).success)
    return {
      ok: false,
      reason: row.numberGiven ? 'INVALID_EMPLOYEE_NUMBER' : 'NO_EMPLOYEE_NUMBER',
    };
  if (row.seen.has(employeeNo)) return { ok: false, reason: 'DUPLICATE_EMPLOYEE_NUMBER' };
  return { ok: true, employeeNo };
}
