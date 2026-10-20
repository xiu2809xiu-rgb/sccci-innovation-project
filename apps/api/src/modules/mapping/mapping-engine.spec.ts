import {
  canonicalEmployeeSchema,
  REQUIRED_EMPLOYEE_FIELDS,
  type FieldMapping,
} from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import { MappingEngine } from './mapping-engine.js';
import { TransformerRegistry } from './transformers/transformer-registry.js';
import {
  CN_HQ_BASELINE_MAPPING,
  SG_HR_BASELINE_MAPPING,
} from '../../../prisma/seed/baseline-mappings.js';

const engine = new MappingEngine(new TransformerRegistry());

/** Tan Mei Ling as SG HR returns her (the adapter has already cut the account number down). */
const sgRecord = {
  employeeNo: 'E100003',
  firstName: 'Mei Ling',
  lastName: 'Tan',
  fullName: 'Tan Mei Ling',
  preferredName: null,
  email: 'MeiLing.Tan@orge.example',
  mobile: '+65 9123 4567',
  department: 'Human Resources',
  departmentCode: 'SG-HR',
  jobTitle: 'HR Business Partner',
  employmentType: 'Permanent',
  status: 'Active',
  hireDate: '2019-03-04',
  resignationDate: null,
  dateOfBirth: '1990-06-12',
  basicSalary: 7800,
  currency: 'SGD',
  bankName: 'DBS Bank',
  bankAccountNo: '••••7890',
  workLocation: 'Singapore',
  reportsTo: 'E100002',
  lastModified: '2026-10-12T03:15:00Z',
};

/** Zhou Xinyi as HQ's SAP-like system returns her: Chinese keys, strings everywhere. */
const cnRecord = {
  员工编号: 'E100005',
  姓名: '周欣怡',
  英文名: 'ZHOU Xinyi',
  法人公司: 'CN01',
  组织单位: '50001030',
  部门名称: '人力资源部',
  职位: '人力资源业务伙伴',
  英文职位: 'HR Business Partner',
  职级: 'P6',
  用工类型: '01',
  雇佣状态: '3',
  试用期: '否',
  休假中: '否',
  入职日期: '2018/09/01',
  离职日期: '',
  出生日期: '1988/11/23',
  手机号码: '+8613812345678',
  电子邮箱: 'xinyi.zhou@orge.example',
  工作地点: '上海',
  成本中心: '3003',
  直属上级: 'E100001',
  基本工资: '32000.00',
  币种: 'CNY',
  开户银行: '中国银行',
  银行账号: '••••4321',
  最后修改时间: '2026/09/30 10:00:00',
};

describe('MappingEngine with the baseline mappings', () => {
  it('turns an SG HR record into a complete, valid canonical employee', () => {
    const { values, issues } = engine.map(sgRecord, SG_HR_BASELINE_MAPPING);
    expect(issues).toEqual([]);
    expect(values).toMatchObject({
      employeeNo: 'E100003',
      entityCode: 'SG01',
      familyName: 'Tan',
      givenName: 'Mei Ling',
      fullNameLatin: 'Tan Mei Ling',
      workEmail: 'meiling.tan@orge.example',
      workPhone: '+6591234567',
      departmentCode: 'HR',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      terminationDate: null,
      workLocation: 'SG-SIN',
      baseSalary: { amount: 7800, currency: 'SGD' },
      bankAccountLast4: '7890',
    });
    // SG HR has no Chinese name, grade or cost centre, so those fields are absent, not empty.
    expect(values).not.toHaveProperty('fullNameLocal');
    expect(canonicalEmployeeSchema.partial().safeParse(values).success).toBe(true);
  });

  it('reads Chinese keys, SAP codes, slash dates and family-first names from CN HQ', () => {
    const { values, issues } = engine.map(cnRecord, CN_HQ_BASELINE_MAPPING);
    expect(issues).toEqual([]);
    expect(values).toMatchObject({
      employeeNo: 'E100005',
      entityCode: 'CN01',
      familyName: 'Zhou',
      givenName: 'Xinyi',
      fullNameLatin: 'Zhou Xinyi',
      fullNameLocal: '周欣怡',
      jobTitleZh: '人力资源业务伙伴',
      departmentCode: 'HR',
      employmentStatus: 'ACTIVE',
      hireDate: '2018-09-01',
      terminationDate: null,
      workLocation: 'CN-SHA',
      baseSalary: { amount: 32000, currency: 'CNY' },
      bankAccountLast4: '4321',
    });
    // HQ has no preferred name, so the record is partial but has everything a new employee needs.
    expect(canonicalEmployeeSchema.partial().safeParse(values).success).toBe(true);
    expect(REQUIRED_EMPLOYEE_FIELDS.filter((field) => !(field in values))).toEqual([]);
  });

  it('applies the SAP status rules in order and keeps Latin-only names out of fullNameLocal', () => {
    const leaver = {
      ...cnRecord,
      姓名: 'RAHMAH Siti',
      英文名: 'RAHMAH Siti',
      雇佣状态: '0',
      试用期: '是',
    };
    const { values } = engine.map(leaver, CN_HQ_BASELINE_MAPPING);
    expect(values.employmentStatus).toBe('TERMINATED');
    expect(values.fullNameLocal).toBeNull();
    expect(values.fullNameLatin).toBe('Rahmah Siti');
    const onProbation = engine.map({ ...cnRecord, 试用期: '是' }, CN_HQ_BASELINE_MAPPING);
    expect(onProbation.values.employmentStatus).toBe('PROBATION');
  });

  it('reports unmappable values, showing them only for INTERNAL fields', () => {
    const broken = {
      ...cnRecord,
      组织单位: '50009999',
      基本工资: 'twelve',
      入职日期: '2026/02/30',
    };
    const { values, issues } = engine.map(broken, CN_HQ_BASELINE_MAPPING);
    const messages = issues.map((issue) => issue.message);
    expect(messages).toContain('组织单位 "50009999": not in the value map');
    expect(messages).toContain('入职日期 "2026/02/30": not a real calendar date');
    expect(messages).toContain('基本工资 (value withheld: restricted): not a number');
    expect(messages.join(' ')).not.toContain('twelve');
    expect(values).not.toHaveProperty('departmentCode');
  });

  it('reports a column the record does not have, and half a salary', () => {
    const { issues } = engine.map({ employeeNo: 'E100003', basicSalary: 100 }, [
      {
        target: 'employeeNo',
        source: 'employeeNo',
        transform: { kind: 'copy' },
        emptyAsNull: true,
      },
      { target: 'jobTitle', source: 'Title', transform: { kind: 'copy' }, emptyAsNull: true },
      {
        target: 'baseSalary.amount',
        source: 'basicSalary',
        transform: { kind: 'number' },
        emptyAsNull: true,
      },
      {
        target: 'baseSalary.currency',
        source: 'currency',
        transform: { kind: 'copy' },
        emptyAsNull: true,
      },
    ]);
    expect(issues.map((issue) => issue.message)).toEqual([
      'Title: the column is missing from the record',
      'currency: the column is missing from the record',
      'Salary needs both an amount and a currency',
    ]);
  });
});

describe('field transformers', () => {
  const one = (
    transform: FieldMapping['transform'],
    value: unknown,
    record: Record<string, unknown> = {},
  ) =>
    engine.map({ ...record, v: value }, [
      { target: 'jobTitle', source: 'v', transform, emptyAsNull: true },
    ]);

  it('reads every supported date layout and Excel date cells', () => {
    expect(one({ kind: 'date', format: 'DD/MM/YYYY' }, '04/03/2019').values.jobTitle).toBe(
      '2019-03-04',
    );
    expect(one({ kind: 'date', format: 'MM/DD/YYYY' }, '03/04/2019').values.jobTitle).toBe(
      '2019-03-04',
    );
    expect(one({ kind: 'date', format: 'YYYYMMDD' }, '20190304').values.jobTitle).toBe(
      '2019-03-04',
    );
    expect(one({ kind: 'date', format: 'DD.MM.YYYY' }, '04.03.2019').values.jobTitle).toBe(
      '2019-03-04',
    );
    expect(
      one({ kind: 'date', format: 'YYYY-MM-DD' }, new Date('2019-03-04T00:00:00Z')).values.jobTitle,
    ).toBe('2019-03-04');
    expect(one({ kind: 'date', format: 'YYYY-MM-DD' }, '04/03/2019').issues).toHaveLength(1);
  });

  it('looks values up exactly, or ignoring case when asked', () => {
    const values = { Permanent: 'FULL_TIME' };
    expect(
      one({ kind: 'value-map', values, caseInsensitive: true }, 'permanent').values.jobTitle,
    ).toBe('FULL_TIME');
    expect(
      one({ kind: 'value-map', values, caseInsensitive: false }, 'permanent').issues,
    ).toHaveLength(1);
  });

  it('normalises phone numbers to E.164', () => {
    const phone = { kind: 'phone', defaultCountryCode: '65' } as const;
    expect(one(phone, '9123 4567').values.jobTitle).toBe('+6591234567');
    expect(one(phone, '0065 9123-4567').values.jobTitle).toBe('+6591234567');
    // A local number drops its trunk prefix when the country code is added.
    expect(one({ kind: 'phone', defaultCountryCode: '60' }, '012-345 6701').values.jobTitle).toBe(
      '+60123456701',
    );
    expect(one(phone, '12').issues).toHaveLength(1);
  });

  it('parses numbers, last digits, case and scripts', () => {
    expect(one({ kind: 'number' }, '12,500.00').values.jobTitle).toBe(12500);
    expect(one({ kind: 'number' }, true).issues).toHaveLength(1);
    expect(one({ kind: 'last-four-digits' }, '123-456789-0').values.jobTitle).toBe('7890');
    expect(one({ kind: 'last-four-digits' }, '12').issues).toHaveLength(1);
    expect(one({ kind: 'lowercase' }, ' A@B.example ').values.jobTitle).toBe('a@b.example');
    expect(one({ kind: 'contains-script', script: 'Han' }, '林慧敏').values.jobTitle).toBe(
      '林慧敏',
    );
    expect(one({ kind: 'contains-script', script: 'Han' }, 'Grace Lim').values.jobTitle).toBeNull();
  });

  it('splits FAMILY Given names, including several family words, and refuses other shapes', () => {
    const family = { kind: 'name-part', format: 'FAMILY_GIVEN', part: 'family' } as const;
    expect(one(family, 'VAN DER BERG Anna').values.jobTitle).toBe('Van Der Berg');
    expect(one(family, 'OUYANG-LI Na').values.jobTitle).toBe('Ouyang-Li');
    expect(one(family, 'Mei Ling').issues).toHaveLength(1);
    const givenFirst = { kind: 'name-full', format: 'FAMILY_GIVEN', order: 'GIVEN_FIRST' } as const;
    expect(one(givenFirst, 'LIM Grace').values.jobTitle).toBe('Grace Lim');
  });

  it('treats empty strings as no value, and refuses values that are not text', () => {
    expect(one({ kind: 'copy' }, '   ').values.jobTitle).toBeNull();
    expect(one({ kind: 'copy' }, { nested: true }).issues).toHaveLength(1);
    expect(one({ kind: 'copy' }, 42).values.jobTitle).toBe(42);
  });

  it('fails when no rule matches', () => {
    const rules: FieldMapping['transform'] = {
      kind: 'rules',
      rules: [{ when: { flag: 'Y' }, value: 'ON_LEAVE' }],
    };
    expect(
      engine.map({ flag: 'N' }, [
        { target: 'employmentStatus', source: null, transform: rules, emptyAsNull: true },
      ]).issues,
    ).toHaveLength(1);
  });
});
