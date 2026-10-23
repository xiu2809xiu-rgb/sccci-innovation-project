import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';
import type { SampleEncoding } from '@huitong/shared';
import { parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';
import { z } from 'zod';

import {
  SampleEncodingUncertainError,
  SampleEncodingUnsupportedError,
} from '../../../common/errors/app-error.js';
import { refuseFile } from './file-refusal.js';
import { decodeStrict, detectEncoding } from './text-encoding.js';
import { inflatedBytes } from './inflated-bytes.js';

/** Where a row is in the file, for reports that point to it without quoting its values. */
export interface RowInfo {
  /** The line the row starts on: blank lines count, and Excel's row number for a workbook. */
  line: number;
  /**
   * Whether the row's cells line up with the headers. A value beyond the last
   * header, or fewer cells than headers (a lost separator), means they may
   * have shifted. Only a CSV row can be short: a workbook pads its rows.
   */
  cells: 'match' | 'extra' | 'missing';
}

/** An uploaded sample: its header row and the first rows, keyed by header. */
export interface SampleFile {
  headers: string[];
  rows: Record<string, unknown>[];
  /** For each row, in the same order. */
  rowInfo: RowInfo[];
}

export interface UploadedFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

/** Enough rows to see each column's shape; the rest of the file is never read. */
export const MAX_SAMPLE_ROWS = 20;
export const MAX_COLUMNS = 60;
export const MAX_SAMPLE_BYTES = 1_000_000;
/** A workbook may unpack to this much and no more: a 5 MB upload must not inflate into gigabytes. */
export const MAX_UNZIPPED_BYTES = 100_000_000;

/** How much of a file to read: a sample for the wizard, or a whole export for an import. */
export interface ReadLimits {
  maxBytes: number;
  maxRows: number;
  /** How much a workbook may really unpack to, counted as it inflates. */
  maxUnzippedBytes: number;
  /** A sample keeps its first rows and ignores the rest; an import refuses a file with more. */
  overflow: 'truncate' | 'refuse';
}

export const SAMPLE_LIMITS: ReadLimits = {
  maxBytes: MAX_SAMPLE_BYTES,
  maxRows: MAX_SAMPLE_ROWS,
  maxUnzippedBytes: MAX_UNZIPPED_BYTES,
  overflow: 'truncate',
};
const MAX_HEADER_LENGTH = 120;

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** What csv-parse returns without column names: rows of text cells. */
const csvRecords = z.array(z.array(z.string()));

/** csv-parse's records with `info`: each record's cells and the line it ends on. */
const csvRecordsWithLines = z.array(
  z.object({ record: z.array(z.string()), info: z.object({ lines: z.number().int() }) }),
);

/** How many headers each reading shows HR when the encoding is uncertain. */
const READING_HEADERS = 8;

const ENCODING_NAMES: Record<SampleEncoding, string> = { 'utf-8': 'UTF-8', gb18030: 'GB18030' };

/** The file's rows as read, before any is dropped, each with the line it starts on. */
interface Table {
  rows: unknown[][];
  lines: number[];
  /** The reader stopped at the import's limit, so the file has more rows than that. */
  capped: boolean;
}

function cell(value: unknown): unknown {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number' || value instanceof Date) return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return null;
}

function headerText(value: unknown): string {
  const text = cell(value);
  if (typeof text === 'string') return text.replace(/\s+/g, ' ').trim();
  if (typeof text === 'number') return String(text);
  return text instanceof Date ? text.toISOString().slice(0, 10) : '';
}

const newlines = (cells: readonly string[]) =>
  cells.reduce((count, text) => count + (text.match(/\n/g)?.length ?? 0), 0);

/**
 * Reads an export (CSV or Excel) into headers and rows: by default a sample of
 * at most MAX_SAMPLE_ROWS rows for the mapping wizard, or, with import limits,
 * the whole file. Nothing is evaluated: formulas arrive as their cached
 * values, macros are never opened. The reader stores nothing.
 * A CSV file's encoding is detected (UTF-8 with or without a byte-order mark,
 * or GB18030, which covers GBK); when two readings are plausible, HR chooses
 * and sends the choice as `encoding`. Excel files are Unicode inside.
 * Every refusal names its problem (`importProblemSchema`), so the UI can say
 * what is wrong in either language.
 */
@Injectable()
export class SampleFileReader {
  async read(
    file: UploadedFile,
    encoding?: SampleEncoding,
    limits: ReadLimits = SAMPLE_LIMITS,
  ): Promise<SampleFile> {
    const megabytes = limits.maxBytes / 1_000_000;
    if (file.size > limits.maxBytes)
      refuseFile(
        { problem: 'FILE_TOO_LARGE', megabytes },
        limits.overflow === 'truncate'
          ? `The sample file is larger than ${String(megabytes)} MB`
          : `The file is larger than ${String(megabytes)} MB`,
      );
    const extension = extname(file.originalname).toLowerCase();
    const table =
      extension === '.csv'
        ? this.readCsv(file.buffer, encoding, limits)
        : extension === '.xlsx'
          ? await this.readXlsx(file.buffer, limits)
          : refuseFile({ problem: 'UNSUPPORTED_TYPE' }, 'Only .csv and .xlsx files can be read');

    const [header, ...data] = table.rows
      .map((cells, index) => ({ cells, line: table.lines[index] ?? index + 1 }))
      .filter(({ cells }) => cells.some((value) => cell(value) !== null));
    if (!header) refuseFile({ problem: 'NO_HEADER_ROW' }, 'The file has no header row');
    const headers = header.cells.map(headerText);
    if (headers.length > MAX_COLUMNS)
      refuseFile(
        { problem: 'TOO_MANY_COLUMNS', limit: MAX_COLUMNS },
        `The file has more than ${String(MAX_COLUMNS)} columns`,
      );
    if (headers.some((text) => text === ''))
      refuseFile({ problem: 'UNNAMED_COLUMN' }, 'Every column needs a header');
    if (headers.some((text) => text.length > MAX_HEADER_LENGTH))
      refuseFile(
        { problem: 'HEADER_TOO_LONG', limit: MAX_HEADER_LENGTH },
        `A header is longer than ${String(MAX_HEADER_LENGTH)} characters`,
      );
    const repeated = headers.find((text, index) => headers.indexOf(text) !== index);
    if (repeated !== undefined)
      refuseFile(
        { problem: 'DUPLICATE_HEADER', column: repeated },
        'Two columns have the same header',
      );

    if (limits.overflow === 'refuse' && (table.capped || data.length > limits.maxRows))
      refuseFile(
        { problem: 'TOO_MANY_ROWS', limit: limits.maxRows },
        `The file has more than ${limits.maxRows.toLocaleString('en')} rows`,
      );
    const taken = data.slice(0, limits.maxRows);
    if (taken.length === 0)
      refuseFile({ problem: 'NO_DATA' }, 'The file has a header row but no data');
    return {
      headers,
      rows: taken.map(({ cells }) =>
        Object.fromEntries(headers.map((text, index) => [text, cell(cells[index])])),
      ),
      rowInfo: taken.map(({ cells, line }) => ({
        line,
        cells: cells.slice(headers.length).some((value) => cell(value) !== null)
          ? 'extra'
          : cells.length < headers.length
            ? 'missing'
            : 'match',
      })),
    };
  }

  private readCsv(buffer: Buffer, chosen: SampleEncoding | undefined, limits: ReadLimits): Table {
    // One kind of line break, so csv-parse counts the lines each record spans exactly.
    const text = this.decodeCsv(buffer, chosen).replace(/\r\n?/g, '\n');
    // A sample needs its first rows; an import reads one record past its limit, to know it is over.
    const cap = limits.maxRows + (limits.overflow === 'truncate' ? 1 : 2);
    let records: z.infer<typeof csvRecordsWithLines>;
    try {
      records = csvRecordsWithLines.parse(
        parse(text, {
          bom: true,
          relax_column_count: true,
          skip_empty_lines: true,
          // A row of empty cells is no row: it must not count towards the limit.
          skip_records_with_empty_values: true,
          info: true,
          to: cap,
        }),
      );
    } catch {
      return refuseFile({ problem: 'UNREADABLE' }, 'The CSV file could not be read');
    }
    return {
      rows: records.map(({ record }) => record),
      // A record's info names the line it ends on; a quoted cell may span lines.
      lines: records.map(({ record, info }) => info.lines - newlines(record)),
      capped: limits.overflow === 'refuse' && records.length >= cap,
    };
  }

  /** The file's text, in the encoding HR chose or the one its bytes show. */
  private decodeCsv(buffer: Buffer, chosen: SampleEncoding | undefined): string {
    if (chosen) {
      const text = decodeStrict(buffer, chosen);
      if (text === null) {
        throw new SampleEncodingUnsupportedError(
          `The file is not valid ${ENCODING_NAMES[chosen]} text`,
        );
      }
      return text;
    }
    const verdict = detectEncoding(buffer);
    if (verdict.kind === 'unsupported') throw new SampleEncodingUnsupportedError();
    if (verdict.kind === 'uncertain') {
      throw new SampleEncodingUncertainError(
        verdict.candidates.map((encoding) => ({
          encoding,
          headers: this.headerRow(decodeStrict(buffer, encoding) ?? ''),
        })),
      );
    }
    return (
      decodeStrict(buffer, verdict.encoding) ??
      refuseFile({ problem: 'UNREADABLE' }, 'The CSV file could not be read')
    );
  }

  /** The first record's cells, shortened, for HR to compare two readings. */
  private headerRow(text: string): string[] {
    try {
      const records: unknown = parse(text, { bom: true, relax_column_count: true, to_line: 1 });
      const [first = []] = csvRecords.parse(records);
      return first.slice(0, READING_HEADERS).map((header) => header.trim().slice(0, 40));
    } catch {
      return [];
    }
  }

  private async readXlsx(buffer: Buffer, limits: ReadLimits): Promise<Table> {
    if (!buffer.subarray(0, 4).equals(ZIP_MAGIC))
      refuseFile({ problem: 'UNREADABLE' }, 'The file is not a valid .xlsx workbook');
    // Counted before the workbook is read, so the reader never inflates more than the limit.
    const unzipped = inflatedBytes(buffer, limits.maxUnzippedBytes);
    if (unzipped === null)
      refuseFile({ problem: 'UNREADABLE' }, 'The file is not a valid .xlsx workbook');
    if (unzipped > limits.maxUnzippedBytes) {
      const megabytes = limits.maxUnzippedBytes / 1_000_000;
      refuseFile(
        { problem: 'WORKBOOK_TOO_LARGE', megabytes },
        `The workbook unpacks to more than ${String(megabytes)} MB`,
      );
    }
    let sheet: unknown[][];
    try {
      sheet = await readSheet(buffer, 1);
    } catch {
      return refuseFile({ problem: 'UNREADABLE' }, 'The Excel file could not be read');
    }
    // The sheet keeps empty rows above and between its data, so a row's index gives its row number.
    const rows = limits.overflow === 'truncate' ? sheet.slice(0, limits.maxRows + 5) : sheet;
    return { rows, lines: rows.map((_row, index) => index + 1), capped: false };
  }
}
