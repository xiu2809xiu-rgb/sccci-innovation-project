import { describe, expect, it } from 'vitest';

import { isCategoricalHeader } from '../../ai/schema-mapping/field-vocabulary.js';
import { buildSchemaMappingPrompt } from '../../ai/schema-mapping/schema-mapping.prompt.js';
import { buildMappingRequest } from './mapping-request.builder.js';
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

  it('never shows values shaped like an identifier, even in a category column', () => {
    for (const values of [
      ['E100006', 'E100006', 'E100009'],
      ['mei.hua@orge.example', 'mei.hua@orge.example', 'raj@orge.example'],
      ['+65 6123 4567', '+65 6123 4567', '+65 6123 4568'],
    ]) {
      expect(describeColumn('Department', values, true).categories).toBeNull();
    }
    expect(describeColumn('Status', ['A', 'T', 'A'], true).categories).toEqual(['A', 'T']);
  });

  it('describes an empty column as empty', () => {
    expect(describeColumn('Preferred name', [null, null], false)).toMatchObject({
      shape: 'empty',
      filled: 0,
    });
  });
});

describe('isCategoricalHeader', () => {
  it('treats department, status and grade columns as categories', () => {
    for (const header of ['Department', '部门', 'Employment Status', 'Job Grade']) {
      expect(isCategoricalHeader(header)).toBe(true);
    }
  });

  it('never treats a column that names a person as a category', () => {
    for (const header of [
      'Department Head',
      '部门负责人',
      'Status updated by',
      'Grade approver',
      'Ketua Jabatan',
    ]) {
      expect(isCategoricalHeader(header)).toBe(false);
    }
  });
});

describe('buildMappingRequest', () => {
  it("keeps a department head's repeated name out of the prompt", () => {
    const sample = {
      headers: ['Staff ID', 'Department', 'Department Head'],
      rows: [
        { 'Staff ID': 'E300101', Department: 'Finance', 'Department Head': 'Tan Wei Ming' },
        { 'Staff ID': 'E300102', Department: 'Finance', 'Department Head': 'Tan Wei Ming' },
        { 'Staff ID': 'E300103', Department: 'Operations', 'Department Head': 'Siti Rahman' },
      ],
    };
    const request = buildMappingRequest(sample, {
      systemName: 'Organisation E Malaysia HR',
      language: 'en',
      entityCode: 'MY01',
    });
    expect(request.columns.find((column) => column.header === 'Department')?.categories).toEqual([
      'Finance',
      'Operations',
    ]);
    expect(
      request.columns.find((column) => column.header === 'Department Head')?.categories,
    ).toBeNull();
    const prompt = buildSchemaMappingPrompt(request);
    expect(prompt).not.toContain('Tan Wei Ming');
    expect(prompt).not.toContain('Siti Rahman');
    expect(prompt).not.toContain('E300101');
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
