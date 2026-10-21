import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  SampleEncodingUncertainError,
  SampleEncodingUnsupportedError,
} from '../../../common/errors/app-error.js';
import { SampleFileReader } from './sample-file-reader.js';
import { detectEncoding, gb2312Share } from './text-encoding.js';

const FIXTURES = path.resolve(import.meta.dirname, '../../../../test/fixtures/encodings');
const fixture = (name: string) => readFileSync(path.join(FIXTURES, name));
const upload = (name: string) => {
  const buffer = fixture(name);
  return { originalname: name, size: buffer.length, buffer };
};

const HEADERS = ['员工编号', '姓名', '部门', '入职日期', '在职状态'];
const reader = new SampleFileReader();

describe('detectEncoding', () => {
  it.each([
    ['utf8.csv', 'utf-8'],
    ['utf8-bom.csv', 'utf-8'],
    ['gbk.csv', 'gb18030'],
    ['gb18030.csv', 'gb18030'],
  ] as const)('reads %s as %s', (name, encoding) => {
    expect(detectEncoding(fixture(name))).toEqual({ kind: 'known', encoding });
  });

  it('treats plain ASCII as UTF-8', () => {
    expect(detectEncoding(Buffer.from('Staff ID,Email\nE300101,a@orge.example\n'))).toEqual({
      kind: 'known',
      encoding: 'utf-8',
    });
  });

  it('is uncertain when the bytes are Chinese-looking GB18030 and valid UTF-8 too', () => {
    expect(detectEncoding(fixture('ambiguous.csv'))).toEqual({
      kind: 'uncertain',
      candidates: ['gb18030', 'utf-8'],
    });
  });

  it('refuses a Latin-1 export instead of misreading it as Chinese', () => {
    expect(detectEncoding(fixture('windows-1252.csv'))).toEqual({ kind: 'unsupported' });
  });
});

describe('gb2312Share', () => {
  it('scores GBK text near 1 and UTF-8 Chinese far lower', () => {
    expect(gb2312Share(fixture('gbk.csv'))).toBeGreaterThan(0.95);
    expect(gb2312Share(fixture('utf8.csv'))).toBeLessThan(0.6);
  });
});

describe('SampleFileReader encodings', () => {
  it.each(['utf8.csv', 'utf8-bom.csv', 'gbk.csv'])(
    'reads the Chinese headers of %s',
    async (name) => {
      const sample = await reader.read(upload(name));
      expect(sample.headers).toEqual(HEADERS);
      expect(sample.rows[0]).toMatchObject({ 姓名: '陈伟明', 部门: '财务部' });
    },
  );

  it('reads a GB18030 character outside GBK (four bytes)', async () => {
    const sample = await reader.read(upload('gb18030.csv'));
    expect(sample.headers).toEqual(HEADERS);
    expect(sample.rows.map((row) => row['姓名'])).toContain('王𠮷');
  });

  it('reads Chinese headers from an Excel workbook, which is Unicode inside', async () => {
    const sample = await reader.read(upload('chinese-headers.xlsx'));
    expect(sample.headers).toEqual(['员工编号', '姓名', '部门', '入职日期']);
    expect(sample.rows.map((row) => row['姓名'])).toEqual(['陈伟明', '林美华', '王𠮷']);
  });

  it('asks HR to choose when two readings are plausible, showing both', async () => {
    const error = await reader.read(upload('ambiguous.csv')).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SampleEncodingUncertainError);
    const { readings } = (error as SampleEncodingUncertainError).details as {
      readings: { encoding: string; headers: string[] }[];
    };
    expect(readings.map((reading) => reading.encoding)).toEqual(['gb18030', 'utf-8']);
    expect(readings[0]?.headers).toEqual(['隆垄', '拢陇', '楼娄搂篓']);
    expect(readings[1]?.headers).toEqual(['¡¢', '£¤', '¥¦§¨']);
  });

  it('reads the file the way HR chose, and refuses a choice the bytes do not fit', async () => {
    const chosen = await reader.read(upload('ambiguous.csv'), 'gb18030');
    expect(chosen.headers).toEqual(['隆垄', '拢陇', '楼娄搂篓']);
    await expect(reader.read(upload('gbk.csv'), 'utf-8')).rejects.toBeInstanceOf(
      SampleEncodingUnsupportedError,
    );
  });

  it('refuses a Latin-1 export with a way forward', async () => {
    await expect(reader.read(upload('windows-1252.csv'))).rejects.toThrow(/Save it as CSV UTF-8/);
  });
});
