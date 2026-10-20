import { describe, expect, it } from 'vitest';

import { checkProhibited } from './prohibited-columns.js';
import { describeColumn, shapeOf } from './sample-shapes.js';

describe('shapeOf', () => {
  it('keeps the layout of a value but none of its content', () => {
    expect(shapeOf('E300101')).toBe('A######');
    expect(shapeOf('Lee Mei Hua')).toBe('Aaa Aaa Aaa');
    expect(shapeOf('李美华')).toBe('汉汉汉');
    expect(shapeOf('012-345 6789')).toBe('###-### ####');
    expect(shapeOf('mei.hua@orge.example')).toBe('text@domain');
    expect(shapeOf(8500)).toBe('whole number');
    expect(shapeOf(new Date('2024-03-01T00:00:00Z'))).toBe('date cell');
  });
});

describe('describeColumn', () => {
  it('tells day-first dates from month-first ones without showing them', () => {
    expect(describeColumn('入职日期', ['01/03/2024', '25/11/2023'], false).shape).toBe(
      '##/##/#### (day first)',
    );
    expect(describeColumn('Hire date', ['03/25/2024'], false).shape).toBe(
      '##/##/#### (month first)',
    );
  });

  it('shows category values only when allowed and repeated', () => {
    const departments = ['财务部', '运营部', '财务部', '信息技术部'];
    expect(describeColumn('部门', departments, true).categories).toEqual([
      '信息技术部',
      '财务部',
      '运营部',
    ]);
    expect(describeColumn('部门', departments, false).categories).toBeNull();
    // Every value different: a column of names, never shown even where categories are allowed.
    expect(describeColumn('Status', ['Lee Mei Hua', 'Rajesh Kumar'], true).categories).toBeNull();
  });

  it('describes an empty column as empty', () => {
    expect(describeColumn('Preferred name', [null, null], false)).toMatchObject({
      shape: 'empty',
      filled: 0,
    });
  });
});

describe('checkProhibited', () => {
  it('flags national ID columns by header, in English, Malay and Chinese', () => {
    for (const header of [
      'NRIC',
      'IC No.',
      'No. KP',
      'MyKad number',
      'Passport',
      '身份证号码',
      '证件号',
    ]) {
      expect(checkProhibited(header, []).prohibited).toBe(true);
    }
    for (const header of ['Basic Salary', 'Finance code', 'Staff ID', 'Topic']) {
      expect(checkProhibited(header, []).prohibited).toBe(false);
    }
  });

  it('flags a column whose values look like ID numbers even under an innocent header', () => {
    expect(checkProhibited('Reference', ['S1234567D', 'T7654321A'])).toEqual({
      prohibited: true,
      kind: 'NATIONAL_ID',
      reason: 'VALUES',
    });
    expect(checkProhibited('Reference', ['900101-14-5678', 'n/a'])).toEqual({
      prohibited: true,
      kind: 'NATIONAL_ID',
      reason: 'VALUES',
    });
    expect(checkProhibited('Staff ID', ['E300101', 'E300102']).prohibited).toBe(false);
  });

  it('flags gender columns by header, in English, Malay and Chinese, but not words that contain "sex"', () => {
    for (const header of ['Gender', 'Sex', 'Employee sex', 'Jantina', '性别']) {
      expect(checkProhibited(header, ['M', 'F'])).toEqual({
        prohibited: true,
        kind: 'GENDER',
        reason: 'HEADER',
      });
    }
    for (const header of ['Sussex office', 'Essex branch', 'Status']) {
      expect(checkProhibited(header, ['M', 'F']).prohibited).toBe(false);
    }
  });
});
