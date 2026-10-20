import type { DateFormat, FieldMapping, MappingTarget, TransformSpec } from '@huitong/shared';

/**
 * Version 1 of the field mappings for the two HR systems, seeded as the
 * approved starting point. Later versions come from HR edits and the AI
 * mapping assistant. Seed data, kept as code so the mapping-engine tests run
 * against exactly what the seed installs.
 */

const map = (
  target: MappingTarget,
  source: string | null,
  transform: TransformSpec,
): FieldMapping => ({
  target,
  source,
  transform,
  emptyAsNull: true,
});

const copy = (target: MappingTarget, source: string) => map(target, source, { kind: 'copy' });

const date = (target: MappingTarget, source: string, format: DateFormat) =>
  map(target, source, { kind: 'date', format });

const lookup = (target: MappingTarget, source: string, values: Record<string, string>) =>
  map(target, source, { kind: 'value-map', values, caseInsensitive: false });

/** SG HR's department codes; Corporate Banking and Legal exist only at HQ. */
const SG_DEPARTMENTS: Record<string, string> = {
  'SG-EXEC': 'EXEC',
  'SG-FIN': 'FIN',
  'SG-HR': 'HR',
  'SG-COMP': 'COMP',
  'SG-RISK': 'RISK',
  'SG-IT': 'IT',
  'SG-OPS': 'OPS',
  'SG-WM': 'WM',
  'SG-ADMIN': 'ADMIN',
};

/** HQ's SAP organisational units; 50001000 (executive office) is the root. */
const CN_ORG_UNITS: Record<string, string> = {
  '50001000': 'EXEC',
  '50001010': 'FIN',
  '50001030': 'HR',
  '50001040': 'COMP',
  '50001050': 'RISK',
  '50001060': 'IT',
  '50001070': 'OPS',
  '50001080': 'WM',
  '50001090': 'CB',
  '50001100': 'ADMIN',
  '50001110': 'LEGAL',
};

export const SG_HR_BASELINE_MAPPING: readonly FieldMapping[] = [
  copy('employeeNo', 'employeeNo'),
  map('entityCode', null, { kind: 'constant', value: 'SG01' }),
  copy('familyName', 'lastName'),
  copy('givenName', 'firstName'),
  copy('fullNameLatin', 'fullName'),
  copy('preferredName', 'preferredName'),
  map('workEmail', 'email', { kind: 'lowercase' }),
  map('workPhone', 'mobile', { kind: 'phone', defaultCountryCode: '65' }),
  lookup('departmentCode', 'departmentCode', SG_DEPARTMENTS),
  copy('jobTitle', 'jobTitle'),
  copy('managerEmployeeNo', 'reportsTo'),
  lookup('employmentType', 'employmentType', {
    Permanent: 'FULL_TIME',
    Contract: 'CONTRACT',
    'Part-Time': 'PART_TIME',
    Intern: 'INTERN',
  }),
  lookup('employmentStatus', 'status', {
    Active: 'ACTIVE',
    Probation: 'PROBATION',
    'On Leave': 'ON_LEAVE',
    Resigned: 'TERMINATED',
  }),
  date('hireDate', 'hireDate', 'YYYY-MM-DD'),
  date('terminationDate', 'resignationDate', 'YYYY-MM-DD'),
  lookup('workLocation', 'workLocation', { Singapore: 'SG-SIN' }),
  date('dateOfBirth', 'dateOfBirth', 'YYYY-MM-DD'),
  map('baseSalary.amount', 'basicSalary', { kind: 'number' }),
  copy('baseSalary.currency', 'currency'),
  copy('bankName', 'bankName'),
  map('bankAccountLast4', 'bankAccountNo', { kind: 'last-four-digits' }),
];

export const CN_HQ_BASELINE_MAPPING: readonly FieldMapping[] = [
  copy('employeeNo', '员工编号'),
  copy('entityCode', '法人公司'),
  map('familyName', '英文名', { kind: 'name-part', format: 'FAMILY_GIVEN', part: 'family' }),
  map('givenName', '英文名', { kind: 'name-part', format: 'FAMILY_GIVEN', part: 'given' }),
  map('fullNameLatin', '英文名', {
    kind: 'name-full',
    format: 'FAMILY_GIVEN',
    order: 'FAMILY_FIRST',
  }),
  map('fullNameLocal', '姓名', { kind: 'contains-script', script: 'Han' }),
  map('workEmail', '电子邮箱', { kind: 'lowercase' }),
  map('workPhone', '手机号码', { kind: 'phone', defaultCountryCode: '86' }),
  lookup('departmentCode', '组织单位', CN_ORG_UNITS),
  copy('jobTitle', '英文职位'),
  copy('jobTitleZh', '职位'),
  copy('jobGrade', '职级'),
  copy('managerEmployeeNo', '直属上级'),
  lookup('employmentType', '用工类型', {
    '01': 'FULL_TIME',
    '02': 'CONTRACT',
    '03': 'INTERN',
    '04': 'PART_TIME',
  }),
  map('employmentStatus', null, {
    kind: 'rules',
    rules: [
      { when: { 雇佣状态: '0' }, value: 'TERMINATED' },
      { when: { 试用期: '是' }, value: 'PROBATION' },
      { when: { 休假中: '是' }, value: 'ON_LEAVE' },
      { when: {}, value: 'ACTIVE' },
    ],
  }),
  date('hireDate', '入职日期', 'YYYY/MM/DD'),
  date('terminationDate', '离职日期', 'YYYY/MM/DD'),
  lookup('workLocation', '工作地点', {
    新加坡: 'SG-SIN',
    上海: 'CN-SHA',
    北京: 'CN-PEK',
    深圳: 'CN-SZX',
  }),
  copy('costCenter', '成本中心'),
  date('dateOfBirth', '出生日期', 'YYYY/MM/DD'),
  map('baseSalary.amount', '基本工资', { kind: 'number' }),
  copy('baseSalary.currency', '币种'),
  copy('bankName', '开户银行'),
  map('bankAccountLast4', '银行账号', { kind: 'last-four-digits' }),
];
