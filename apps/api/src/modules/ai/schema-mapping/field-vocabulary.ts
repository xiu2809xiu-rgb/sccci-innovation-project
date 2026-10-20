import { DEPARTMENTS, type Locale, type MappingTarget } from '@huitong/shared';

/** Lower case with spaces and punctuation removed (Chinese characters kept), so "Staff ID" matches "staffid". */
export function normalise(text: string): string {
  return text.toLocaleLowerCase('en').replace(/[^\p{L}\p{Nd}]/gu, '');
}

export interface FieldWords {
  target: MappingTarget;
  label: Record<Locale, string>;
  /** Header words in English, Chinese and Malay, normalised. */
  synonyms: readonly string[];
  /** Whether the column holds categories, whose distinct values may be shown to the model. */
  categorical: boolean;
}

const words = (
  target: MappingTarget,
  en: string,
  zh: string,
  synonyms: readonly string[],
  categorical = false,
): FieldWords => ({
  target,
  label: { en, 'zh-CN': zh },
  synonyms: synonyms.map(normalise),
  categorical,
});

/**
 * What HR exports tend to call each canonical field. The deterministic mock
 * model matches headers against these; a real model gets the labels in its prompt.
 */
export const FIELD_WORDS: readonly FieldWords[] = [
  words('employeeNo', 'employee number', '员工编号', [
    'staff id',
    'employee id',
    'employee no',
    'employee number',
    'emp no',
    'emp id',
    'staff no',
    'worker id',
    '员工编号',
    '工号',
    '员工号',
    'no pekerja',
    'id pekerja',
  ]),
  words('fullNameLatin', 'full name', '全名', [
    'full name',
    'name',
    'employee name',
    'nama',
    'nama penuh',
    '英文姓名',
    '英文名',
  ]),
  words('familyName', 'family name', '姓', [
    'family name',
    'surname',
    'last name',
    '姓',
    '姓氏',
    'nama keluarga',
  ]),
  words('givenName', 'given name', '名', ['given name', 'first name', 'forename', '名', '名字']),
  words('fullNameLocal', 'name in Chinese characters', '中文姓名', [
    '中文姓名',
    '中文名',
    '姓名',
    'chinese name',
    'local name',
  ]),
  words('preferredName', 'preferred name', '常用名', [
    'preferred name',
    'nickname',
    'known as',
    '常用名',
  ]),
  words('workEmail', 'work email', '工作邮箱', [
    'email',
    'email address',
    'work email',
    '邮箱',
    '电子邮箱',
    '邮件',
    'emel',
  ]),
  words('workPhone', 'work phone', '工作电话', [
    'mobile',
    'mobile no',
    'phone',
    'phone no',
    'handphone',
    'contact no',
    '手机',
    '手机号',
    '手机号码',
    '电话',
    'no telefon',
    'nombor telefon',
  ]),
  words(
    'departmentCode',
    'department',
    '部门',
    ['department', 'dept', '部门', '部门名称', 'jabatan', 'bahagian'],
    true,
  ),
  words('jobTitle', 'job title', '职位', [
    'position',
    'job title',
    'title',
    'designation',
    'role',
    'jawatan',
    '英文职位',
  ]),
  words('jobTitleZh', 'job title in Chinese', '中文职位', ['职位', '岗位', '中文职位']),
  words(
    'jobGrade',
    'job grade',
    '职级',
    ['grade', 'job grade', 'level', 'band', '职级', '级别', 'gred'],
    true,
  ),
  words('managerEmployeeNo', 'manager', '直属上级', [
    'manager id',
    'manager',
    'reports to',
    'supervisor',
    '直属上级',
    '上级',
    'pengurus',
  ]),
  words(
    'employmentType',
    'employment type',
    '用工类型',
    ['employment type', 'contract type', 'type', '用工类型', '雇佣类型', 'jenis pekerjaan'],
    true,
  ),
  words(
    'employmentStatus',
    'employment status',
    '在职状态',
    ['status', 'employment status', '状态', '在职状态', '雇佣状态', 'status pekerjaan'],
    true,
  ),
  words('hireDate', 'hire date', '入职日期', [
    'hire date',
    'join date',
    'joining date',
    'start date',
    'date of joining',
    '入职日期',
    '入职时间',
    'tarikh mula',
    'tarikh lantikan',
  ]),
  words('terminationDate', 'termination date', '离职日期', [
    'termination date',
    'end date',
    'last day',
    'resignation date',
    '离职日期',
    'tarikh berhenti',
  ]),
  words(
    'workLocation',
    'work location',
    '工作地点',
    ['work location', 'location', 'office', '工作地点', '地点', 'lokasi'],
    true,
  ),
  words('costCenter', 'cost centre', '成本中心', [
    'cost centre',
    'cost center',
    '成本中心',
    'pusat kos',
  ]),
  words('dateOfBirth', 'date of birth', '出生日期', [
    'date of birth',
    'dob',
    'birth date',
    '出生日期',
    '生日',
    'tarikh lahir',
  ]),
  words('baseSalary.amount', 'base salary', '基本工资', [
    'basic salary',
    'salary',
    'base salary',
    'basic pay',
    '基本工资',
    '工资',
    '薪资',
    'gaji pokok',
    'gaji',
  ]),
  words(
    'baseSalary.currency',
    'salary currency',
    '币种',
    ['currency', '币种', '货币', 'mata wang'],
    true,
  ),
  words(
    'bankName',
    'bank',
    '开户银行',
    ['bank', 'bank name', '开户银行', '银行', 'nama bank'],
    true,
  ),
  words('bankAccountLast4', 'bank account (last four digits)', '银行账号（后四位）', [
    'account no',
    'bank account',
    'account number',
    'bank account no',
    '银行账号',
    '账号',
    'no akaun',
  ]),
];

const departmentWords: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.flatMap((department) => [
    [normalise(department.code), department.code],
    [normalise(department.nameEn), department.code],
    [normalise(department.nameZh), department.code],
  ]),
);

/** Category values the mock model recognises, normalised, with the canonical value each means. */
export const CATEGORY_WORDS: Partial<Record<MappingTarget, Record<string, string>>> = {
  departmentCode: {
    ...departmentWords,
    [normalise('Wealth Mgmt')]: 'WM',
    [normalise('Ops')]: 'OPS',
    [normalise('Human Resource')]: 'HR',
    [normalise('Admin')]: 'ADMIN',
  },
  employmentType: Object.fromEntries(
    [
      ['FULL_TIME', ['permanent', 'full time', 'full-time', 'fulltime', '正式', '全职', 'tetap']],
      ['CONTRACT', ['contract', 'fixed term', '合同', '合同工', 'kontrak']],
      ['PART_TIME', ['part time', 'part-time', '兼职', 'separuh masa']],
      ['INTERN', ['intern', 'internship', '实习', '实习生', 'pelatih']],
    ].flatMap(([value, list]) =>
      (list as string[]).map((word) => [normalise(word), value as string]),
    ),
  ),
  employmentStatus: Object.fromEntries(
    [
      ['ACTIVE', ['active', 'employed', '在职', '正常', 'aktif']],
      ['PROBATION', ['probation', 'on probation', '试用期', '试用', 'percubaan']],
      ['ON_LEAVE', ['on leave', 'leave', '休假', '休假中', 'cuti']],
      ['TERMINATED', ['resigned', 'terminated', 'left', '离职', '已离职', 'berhenti']],
    ].flatMap(([value, list]) =>
      (list as string[]).map((word) => [normalise(word), value as string]),
    ),
  ),
  workLocation: Object.fromEntries(
    [
      ['MY-KUL', ['kuala lumpur', 'kl', '吉隆坡']],
      ['SG-SIN', ['singapore', '新加坡']],
      ['CN-SHA', ['shanghai', '上海']],
      ['CN-PEK', ['beijing', '北京']],
      ['CN-SZX', ['shenzhen', '深圳']],
    ].flatMap(([value, list]) =>
      (list as string[]).map((word) => [normalise(word), value as string]),
    ),
  ),
  'baseSalary.currency': {
    myr: 'MYR',
    rm: 'MYR',
    sgd: 'SGD',
    cny: 'CNY',
    rmb: 'CNY',
    [normalise('人民币')]: 'CNY',
    [normalise('新元')]: 'SGD',
    [normalise('令吉')]: 'MYR',
  },
};

/** Whether a header names a category field (department, status, location...), whose repeated values are safe to show. */
export function isCategoricalHeader(header: string): boolean {
  const key = normalise(header);
  return FIELD_WORDS.some(
    (words) =>
      words.categorical &&
      words.synonyms.some(
        (synonym) => synonym === key || (synonym.length >= 3 && key.includes(synonym)),
      ),
  );
}
