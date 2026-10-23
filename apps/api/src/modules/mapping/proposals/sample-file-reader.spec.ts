import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { ValidationFailedError } from '../../../common/errors/app-error.js';
import { workbook } from '../../../../test/support/xlsx-workbook.js';
import {
  MAX_UNZIPPED_BYTES,
  SAMPLE_LIMITS,
  SampleFileReader,
  type ReadLimits,
} from './sample-file-reader.js';

const reader = new SampleFileReader();

/** A whole export, as a file connector's import reads it (small limits keep the test quick). */
const WHOLE_FILE: ReadLimits = {
  maxBytes: 5_000_000,
  maxRows: 30,
  maxUnzippedBytes: 1_000_000,
  overflow: 'refuse',
};

function upload(name: string, content: string | Buffer) {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return { originalname: name, size: buffer.length, buffer };
}

/** A CSV export with a header row and `rows` synthetic data rows. */
function csv(rows: number, trailer = '') {
  const lines = ['Staff ID,Email'];
  for (let index = 1; index <= rows; index += 1) {
    lines.push(`E${String(300_000 + index)},person${String(index)}@orge.example`);
  }
  return upload('export.csv', `${lines.join('\r\n')}\r\n${trailer}`);
}

/** The English message and the problem a refusal carries for the UI. */
async function refusal(read: Promise<unknown>): Promise<{ message: string; problem: unknown }> {
  try {
    await read;
  } catch (error) {
    if (!(error instanceof ValidationFailedError)) throw error;
    const [detail] = error.details as Record<string, unknown>[];
    const { path: _path, message: _message, ...problem } = detail ?? {};
    return { message: error.message, problem };
  }
  throw new Error('expected the file to be refused');
}

describe('SampleFileReader limits', () => {
  it('reads only the first rows of a sample for the mapping wizard', async () => {
    const sample = await reader.read(csv(25));
    expect(sample.rows).toHaveLength(SAMPLE_LIMITS.maxRows);
    expect(sample.rows[0]).toEqual({ 'Staff ID': 'E300001', Email: 'person1@orge.example' });
  });

  it('reads every row of a whole export within the limit', async () => {
    const whole = await reader.read(csv(30), undefined, WHOLE_FILE);
    expect(whole.rows).toHaveLength(30);
    expect(whole.rows.at(-1)).toEqual({ 'Staff ID': 'E300030', Email: 'person30@orge.example' });
  });

  it('refuses an export with more rows than the limit, rather than cutting it short', async () => {
    expect(await refusal(reader.read(csv(31), undefined, WHOLE_FILE))).toEqual({
      message: 'The file has more than 30 rows',
      problem: { problem: 'TOO_MANY_ROWS', limit: 30 },
    });
  });

  it('does not count rows of empty cells towards the limit', async () => {
    const whole = await reader.read(csv(30, ',\r\n , \r\n,\r\n'), undefined, WHOLE_FILE);
    expect(whole.rows).toHaveLength(30);
  });

  it('refuses a file larger than the limit, naming the limit', async () => {
    const large = { ...csv(1), size: 5_000_001 };
    expect(await refusal(reader.read(large, undefined, WHOLE_FILE))).toEqual({
      message: 'The file is larger than 5 MB',
      problem: { problem: 'FILE_TOO_LARGE', megabytes: 5 },
    });
    expect((await refusal(reader.read({ ...large, size: 1_000_001 }))).message).toBe(
      'The sample file is larger than 1 MB',
    );
  });

  it('bounds what a sample may unpack to by the workbook limit', () => {
    expect(SAMPLE_LIMITS.maxUnzippedBytes).toBe(MAX_UNZIPPED_BYTES);
  });
});

describe('SampleFileReader rows', () => {
  it('gives each row the line it starts on, counting blank lines and a cell over two lines', async () => {
    const file = await reader.read(
      upload('export.csv', 'Staff ID,Name\r\n\r\nE300001,"Tan\r\nMei Ling"\r\n\r\nE300002,Lee\r\n'),
      undefined,
      WHOLE_FILE,
    );
    expect(file.rows).toEqual([
      { 'Staff ID': 'E300001', Name: 'Tan\nMei Ling' },
      { 'Staff ID': 'E300002', Name: 'Lee' },
    ]);
    expect(file.rowInfo.map((row) => row.line)).toEqual([3, 6]);
  });

  it('counts the blank lines above the header, and a row of empty cells, too', async () => {
    const file = await reader.read(
      upload('export.csv', '\r\n\r\nStaff ID,Name\r\nE300001,Tan\r\n,\r\nE300002,Lee\r\n'),
    );
    expect(file.headers).toEqual(['Staff ID', 'Name']);
    expect(file.rowInfo).toEqual([
      { line: 4, cells: 'match' },
      { line: 6, cells: 'match' },
    ]);
  });

  it('marks a row whose cells do not line up with the headers, but not an empty extra cell', async () => {
    const file = await reader.read(
      upload(
        'export.csv',
        'Staff ID,Name,Team\nE300001,Tan, Mei Ling,HR\nE300002,Lee,HR,\nE300003,Ong\n',
      ),
      undefined,
      WHOLE_FILE,
    );
    expect(file.rowInfo).toEqual([
      { line: 2, cells: 'extra' },
      { line: 3, cells: 'match' },
      { line: 4, cells: 'missing' },
    ]);
  });

  it("gives a workbook's rows their row numbers, empty rows above and between them counted", async () => {
    const file = await reader.read(
      upload(
        'export.xlsx',
        workbook([
          { row: 3, cells: ['Staff ID', 'Name'] },
          { row: 4, cells: ['E300001', 'Tan'] },
          { row: 7, cells: ['E300002', 'Lee'] },
        ]),
      ),
      undefined,
      WHOLE_FILE,
    );
    expect(file.headers).toEqual(['Staff ID', 'Name']);
    expect(file.rows).toEqual([
      { 'Staff ID': 'E300001', Name: 'Tan' },
      { 'Staff ID': 'E300002', Name: 'Lee' },
    ]);
    expect(file.rowInfo).toEqual([
      { line: 4, cells: 'match' },
      { line: 7, cells: 'match' },
    ]);
  });
});

describe('SampleFileReader refusals', () => {
  it('names the problem with every whole-file refusal, so the UI can word it', async () => {
    expect(await refusal(reader.read(upload('export.txt', 'Staff ID\nE300001\n')))).toEqual({
      message: 'Only .csv and .xlsx files can be read',
      problem: { problem: 'UNSUPPORTED_TYPE' },
    });
    expect(await refusal(reader.read(upload('export.csv', 'Staff ID,Staff ID\nE1,E2\n')))).toEqual({
      message: 'Two columns have the same header',
      problem: { problem: 'DUPLICATE_HEADER', column: 'Staff ID' },
    });
    expect(await refusal(reader.read(upload('export.csv', 'Staff ID,Name\n')))).toEqual({
      message: 'The file has a header row but no data',
      problem: { problem: 'NO_DATA' },
    });
    expect(await refusal(reader.read(upload('export.csv', 'Staff ID,,Name\nE1,x,y\n')))).toEqual({
      message: 'Every column needs a header',
      problem: { problem: 'UNNAMED_COLUMN' },
    });
  });

  it('refuses a workbook that really unpacks to too much, before it is read', async () => {
    const bomb = Buffer.from(zipSync({ 'xl/worksheets/sheet1.xml': new Uint8Array(2_000_000) }));
    expect(await refusal(reader.read(upload('export.xlsx', bomb), undefined, WHOLE_FILE))).toEqual({
      message: 'The workbook unpacks to more than 1 MB',
      problem: { problem: 'WORKBOOK_TOO_LARGE', megabytes: 1 },
    });
  });

  it('refuses a file that only looks like a workbook', async () => {
    const fake = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('not a zip')]);
    expect(await refusal(reader.read(upload('export.xlsx', fake)))).toEqual({
      message: 'The file is not a valid .xlsx workbook',
      problem: { problem: 'UNREADABLE' },
    });
  });
});
