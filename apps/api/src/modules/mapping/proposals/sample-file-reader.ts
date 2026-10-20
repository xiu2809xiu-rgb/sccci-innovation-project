import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';

import { ValidationFailedError } from '../../../common/errors/app-error.js';

/** An uploaded sample: its header row and the first rows, keyed by header. */
export interface SampleFile {
  headers: string[];
  rows: Record<string, unknown>[];
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
const MAX_HEADER_LENGTH = 120;

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function fail(message: string): never {
  throw new ValidationFailedError([{ path: 'file', message }], message);
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

/**
 * Reads a sample export (CSV or Excel) into headers and at most
 * MAX_SAMPLE_ROWS rows. Nothing is evaluated: formulas arrive as their cached
 * values, macros are never opened. The sample itself is never stored.
 */
@Injectable()
export class SampleFileReader {
  async read(file: UploadedFile): Promise<SampleFile> {
    if (file.size > MAX_SAMPLE_BYTES) fail('The sample file is larger than 1 MB');
    const extension = extname(file.originalname).toLowerCase();
    const table =
      extension === '.csv'
        ? this.readCsv(file.buffer)
        : extension === '.xlsx'
          ? await this.readXlsx(file.buffer)
          : fail('Only .csv and .xlsx files can be read');

    const [headerRow, ...dataRows] = table.filter((row) =>
      row.some((value) => cell(value) !== null),
    );
    if (!headerRow) fail('The file has no header row');
    const headers = headerRow.map(headerText);
    if (headers.length > MAX_COLUMNS) fail(`The file has more than ${String(MAX_COLUMNS)} columns`);
    if (headers.some((header) => header === '')) fail('Every column needs a header');
    if (headers.some((header) => header.length > MAX_HEADER_LENGTH))
      fail('A header is longer than 120 characters');
    if (new Set(headers).size !== headers.length) fail('Two columns have the same header');

    const rows = dataRows
      .slice(0, MAX_SAMPLE_ROWS)
      .map((row) => Object.fromEntries(headers.map((header, index) => [header, cell(row[index])])));
    if (rows.length === 0) fail('The file has a header row but no data');
    return { headers, rows };
  }

  private readCsv(buffer: Buffer): unknown[][] {
    try {
      return parse(buffer, {
        bom: true,
        relax_column_count: true,
        skip_empty_lines: true,
        to_line: MAX_SAMPLE_ROWS + 1,
      });
    } catch {
      return fail('The CSV file could not be read');
    }
  }

  private async readXlsx(buffer: Buffer): Promise<unknown[][]> {
    if (!buffer.subarray(0, 4).equals(ZIP_MAGIC)) fail('The file is not a valid .xlsx workbook');
    try {
      const sheet = await readSheet(buffer, 1);
      return sheet.slice(0, MAX_SAMPLE_ROWS + 5);
    } catch {
      return fail('The Excel file could not be read');
    }
  }
}
