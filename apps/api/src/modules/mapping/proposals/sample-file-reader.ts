import { extname } from 'node:path';

import { Injectable } from '@nestjs/common';
import type { SampleEncoding } from '@huitong/shared';
import { parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';
import { z } from 'zod';

import {
  SampleEncodingUncertainError,
  SampleEncodingUnsupportedError,
  ValidationFailedError,
} from '../../../common/errors/app-error.js';
import { decodeStrict, detectEncoding } from './text-encoding.js';

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

/** What csv-parse returns without column names: rows of text cells. */
const csvRecords = z.array(z.array(z.string()));

/** How many headers each reading shows HR when the encoding is uncertain. */
const READING_HEADERS = 8;

const ENCODING_NAMES: Record<SampleEncoding, string> = { 'utf-8': 'UTF-8', gb18030: 'GB18030' };

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
 * A CSV file's encoding is detected (UTF-8 with or without a byte-order mark,
 * or GB18030, which covers GBK); when two readings are plausible, HR chooses
 * and sends the choice as `encoding`. Excel files are Unicode inside.
 */
@Injectable()
export class SampleFileReader {
  async read(file: UploadedFile, encoding?: SampleEncoding): Promise<SampleFile> {
    if (file.size > MAX_SAMPLE_BYTES) fail('The sample file is larger than 1 MB');
    const extension = extname(file.originalname).toLowerCase();
    const table =
      extension === '.csv'
        ? this.readCsv(file.buffer, encoding)
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

  private readCsv(buffer: Buffer, chosen: SampleEncoding | undefined): unknown[][] {
    const text = this.decodeCsv(buffer, chosen);
    try {
      return parse(text, {
        bom: true,
        relax_column_count: true,
        skip_empty_lines: true,
        to_line: MAX_SAMPLE_ROWS + 1,
      });
    } catch {
      return fail('The CSV file could not be read');
    }
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
    return decodeStrict(buffer, verdict.encoding) ?? fail('The CSV file could not be read');
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
