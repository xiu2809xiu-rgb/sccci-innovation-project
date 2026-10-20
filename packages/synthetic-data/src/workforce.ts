import { addDays } from './dates.js';
import { generateDrift } from './drift.js';
import { DEPARTMENT_TITLES, SALARY_BANDS, type JobTitle } from './job-titles.js';
import {
  indianName,
  mainlandChineseName,
  malayName,
  POOL_SIZES,
  singaporeChineseName,
  type PersonName,
} from './names.js';
import { SeededRandom } from './prng.js';
import { DATASET_REFERENCE_DATE, departmentByCode, SYNTHETIC_SEED } from './reference-data.js';
import type {
  DepartmentCode,
  EmploymentStatus,
  EmploymentType,
  EntityCode,
  SyntheticEmployee,
  WorkLocationCode,
  Workforce,
} from './types.js';

/** Headcount per department and entity (SG01 totals 50, CN01 totals 70). */
const HEADCOUNT: Readonly<Record<EntityCode, Partial<Record<DepartmentCode, number>>>> = {
  SG01: { EXEC: 2, FIN: 5, HR: 4, COMP: 5, RISK: 4, IT: 6, OPS: 8, WM: 12, ADMIN: 4 },
  CN01: {
    EXEC: 3,
    FIN: 8,
    HR: 6,
    COMP: 5,
    RISK: 6,
    IT: 12,
    OPS: 10,
    WM: 8,
    CB: 6,
    ADMIN: 3,
    LEGAL: 3,
  },
};

/** Who someone reports to: nobody, the entity's top executive, their department head, or a named person. */
type ManagerRef = 'none' | 'top' | 'head' | `E${number}`;

interface FixedPerson {
  employeeNo: string;
  entityCode: EntityCode;
  name: PersonName;
  preferredName: string | null;
  departmentCode: DepartmentCode;
  title: JobTitle;
  reportsTo: ManagerRef;
  isHead: boolean;
  hireDate: string;
  dateOfBirth: string;
  workLocation: WorkLocationCode;
}

/** The nine fixed people: demo users and personas (facts sheet section 5). */
const FIXED_PEOPLE: readonly FixedPerson[] = [
  {
    employeeNo: 'E100001',
    entityCode: 'CN01',
    name: {
      familyName: 'Li',
      givenName: 'Guoqiang',
      fullNameLatin: 'Li Guoqiang',
      nameZh: '李国强',
    },
    preferredName: null,
    departmentCode: 'EXEC',
    title: { en: 'Group Managing Director', zh: '集团董事总经理', grade: 'M5' },
    reportsTo: 'none',
    isHead: false,
    hireDate: '2012-03-01',
    dateOfBirth: '1968-05-12',
    workLocation: 'CN-SHA',
  },
  {
    employeeNo: 'E100002',
    entityCode: 'SG01',
    name: {
      familyName: 'Lim',
      givenName: 'Wei Jie',
      fullNameLatin: 'Lim Wei Jie',
      nameZh: '林伟杰',
    },
    preferredName: null,
    departmentCode: 'EXEC',
    title: { en: 'Chief Executive Officer (Singapore)', zh: '新加坡首席执行官', grade: 'M5' },
    reportsTo: 'none',
    isHead: false,
    hireDate: '2014-06-02',
    dateOfBirth: '1971-09-23',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100003',
    entityCode: 'SG01',
    name: {
      familyName: 'Tan',
      givenName: 'Mei Ling',
      fullNameLatin: 'Tan Mei Ling',
      nameZh: '谭美玲',
    },
    preferredName: 'Meiling',
    departmentCode: 'HR',
    title: { en: 'HR Executive', zh: '人力资源专员', grade: 'P5' },
    reportsTo: 'E100004',
    isHead: false,
    hireDate: '2021-03-15',
    dateOfBirth: '1992-07-04',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100004',
    entityCode: 'SG01',
    name: { familyName: 'Rahmah', givenName: 'Siti', fullNameLatin: 'Siti Rahmah', nameZh: null },
    preferredName: null,
    departmentCode: 'HR',
    title: { en: 'HR Manager', zh: '人力资源经理', grade: 'M2' },
    reportsTo: 'top',
    isHead: true,
    hireDate: '2017-01-09',
    dateOfBirth: '1985-02-17',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100005',
    entityCode: 'CN01',
    name: { familyName: 'Zhou', givenName: 'Xinyi', fullNameLatin: 'Zhou Xinyi', nameZh: '周欣怡' },
    preferredName: null,
    departmentCode: 'HR',
    title: { en: 'HR Business Partner (Overseas)', zh: '海外人力资源业务伙伴', grade: 'P6' },
    reportsTo: 'head',
    isHead: false,
    hireDate: '2019-08-19',
    dateOfBirth: '1990-11-08',
    workLocation: 'CN-SHA',
  },
  {
    employeeNo: 'E100006',
    entityCode: 'SG01',
    name: { familyName: 'Menon', givenName: 'Arjun', fullNameLatin: 'Arjun Menon', nameZh: null },
    preferredName: null,
    departmentCode: 'WM',
    title: { en: 'Head of Wealth Management', zh: '财富管理部负责人', grade: 'M3' },
    reportsTo: 'top',
    isHead: true,
    hireDate: '2016-04-04',
    dateOfBirth: '1979-03-30',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100007',
    entityCode: 'SG01',
    name: { familyName: 'Nur', givenName: 'Aisyah', fullNameLatin: 'Nur Aisyah', nameZh: null },
    preferredName: null,
    departmentCode: 'ADMIN',
    title: { en: 'Administration Executive', zh: '行政专员', grade: 'P4' },
    reportsTo: 'head',
    isHead: false,
    hireDate: '2022-10-03',
    dateOfBirth: '1996-01-21',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100008',
    entityCode: 'SG01',
    name: {
      familyName: 'Ismail',
      givenName: 'Farhan',
      fullNameLatin: 'Farhan Ismail',
      nameZh: null,
    },
    preferredName: null,
    departmentCode: 'IT',
    title: { en: 'IT Systems Administrator', zh: '系统管理员', grade: 'P5' },
    reportsTo: 'head',
    isHead: false,
    hireDate: '2020-02-17',
    dateOfBirth: '1991-06-14',
    workLocation: 'SG-SIN',
  },
  {
    employeeNo: 'E100009',
    entityCode: 'SG01',
    name: { familyName: 'Lim', givenName: 'Grace', fullNameLatin: 'Grace Lim', nameZh: '林慧敏' },
    preferredName: null,
    departmentCode: 'COMP',
    title: { en: 'Compliance Officer', zh: '合规专员', grade: 'P5' },
    reportsTo: 'head',
    isHead: false,
    hireDate: '2019-05-06',
    dateOfBirth: '1988-12-02',
    workLocation: 'SG-SIN',
  },
];

const TOP_EXECUTIVE: Readonly<Record<EntityCode, string>> = { SG01: 'E100002', CN01: 'E100001' };

/** English preferred names some staff use at work. */
const PREFERRED_NAMES = [
  'Jasmine',
  'Darren',
  'Kelvin',
  'Michelle',
  'Bryan',
  'Vivian',
  'Eric',
  'Fiona',
];

const AGE_BY_GRADE: Readonly<Record<string, [number, number]>> = {
  P1: [21, 24],
  P3: [23, 30],
  P4: [25, 34],
  P5: [27, 40],
  P6: [30, 45],
  P7: [34, 50],
  M1: [33, 48],
  M2: [35, 52],
  M3: [38, 58],
  M5: [50, 62],
};

/** Interns are generated from their department's name rather than the title ladder. */
const INTERN_BAND = {
  SGD: [1200, 1800] as [number, number],
  CNY: [4000, 6000] as [number, number],
};

interface Draft extends Omit<SyntheticEmployee, 'employeeNo' | 'managerEmployeeNo' | 'workEmail'> {
  key: string;
  fixedNo: string | null;
  isHead: boolean;
  reportsTo: ManagerRef;
}

/** `Mei Ling` -> `meiling`; strips anything that is not ASCII a-z. */
function emailPart(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

function salaryFor(
  rng: SeededRandom,
  grade: string,
  currency: 'SGD' | 'CNY',
  intern: boolean,
): number {
  const band = intern ? INTERN_BAND[currency] : SALARY_BANDS[grade]?.[currency];
  if (!band) {
    throw new Error(`No salary band for grade ${grade}`);
  }
  return Math.round(rng.int(band[0], band[1]) / 100) * 100;
}

function dateOfBirthFor(rng: SeededRandom, grade: string, hireDate: string): string {
  const [minAge, maxAge] = AGE_BY_GRADE[grade] ?? [25, 45];
  const age = rng.int(minAge, maxAge);
  const referenceYear = Number(DATASET_REFERENCE_DATE.slice(0, 4));
  const hireYear = Number(hireDate.slice(0, 4));
  // Nobody joins before turning 21.
  const year = Math.min(referenceYear - age, hireYear - 21);
  const month = String(rng.int(1, 12)).padStart(2, '0');
  const day = String(rng.int(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hireDateFor(rng: SeededRandom, grade: string, isHead: boolean): string {
  const earliest = isHead ? 2013 : grade === 'P3' || grade === 'P1' ? 2023 : 2015;
  const latest = isHead ? 2020 : 2026;
  const year = rng.int(earliest, latest);
  const maxMonth = year === 2026 ? 6 : 12;
  return `${year}-${String(rng.int(1, maxMonth)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`;
}

function phoneFor(rng: SeededRandom, entity: EntityCode, used: Set<string>): string {
  for (;;) {
    const phone =
      entity === 'SG01'
        ? `+65${rng.pick(['8', '9'])}${String(rng.int(0, 9_999_999)).padStart(7, '0')}`
        : `+861${rng.pick(['3', '5', '7', '8', '9'])}${String(rng.int(0, 999_999_999)).padStart(9, '0')}`;
    if (!used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
}

/** Synthetic account digits, deliberately not shaped like any real bank's numbers. */
function bankFor(
  rng: SeededRandom,
  entity: EntityCode,
): { bankName: string; bankAccountNumber: string } {
  if (entity === 'SG01') {
    return {
      bankName: rng.pick(['DBS Bank', 'OCBC Bank', 'UOB']),
      bankAccountNumber: `9${String(rng.int(0, 999_999_999)).padStart(9, '0')}`,
    };
  }
  return {
    bankName: rng.pick(['招商银行', '中国工商银行', '中国银行']),
    bankAccountNumber: `9${String(rng.int(0, 999_999_999)).padStart(9, '0')}${String(rng.int(0, 999_999)).padStart(6, '0')}`,
  };
}

function cnLocation(rng: SeededRandom): WorkLocationCode {
  const roll = rng.next();
  return roll < 0.6 ? 'CN-SHA' : roll < 0.85 ? 'CN-PEK' : 'CN-SZX';
}

/** Name generator for generated (non-fixed) staff, cycling through each pool without repeats. */
class NamePicker {
  private sgChinese = 0;
  private mainland = 0;
  private malay = 0;
  private indian = 0;
  private readonly used = new Set<string>();

  constructor(private readonly rng: SeededRandom) {}

  next(entity: EntityCode, ethnicity: 'chinese' | 'malay' | 'indian'): PersonName {
    for (;;) {
      const name = this.candidate(entity, ethnicity);
      if (!this.used.has(name.fullNameLatin)) {
        this.used.add(name.fullNameLatin);
        return name;
      }
    }
  }

  reserve(name: PersonName): void {
    this.used.add(name.fullNameLatin);
  }

  private candidate(entity: EntityCode, ethnicity: 'chinese' | 'malay' | 'indian'): PersonName {
    if (ethnicity === 'malay') {
      return malayName(this.malay++);
    }
    if (ethnicity === 'indian') {
      return indianName(this.indian++);
    }
    const given = this.rng.int(0, POOL_SIZES.chineseGiven - 1);
    if (entity === 'SG01') {
      return singaporeChineseName(this.sgChinese++, given);
    }
    return mainlandChineseName(this.mainland++ * 7, given);
  }
}

/** Ethnicity mix for the 43 generated Singapore staff: 25 Chinese, 9 Malay, 9 Indian. */
function singaporeEthnicities(rng: SeededRandom): ('chinese' | 'malay' | 'indian')[] {
  const list: ('chinese' | 'malay' | 'indian')[] = [
    ...Array<'chinese'>(25).fill('chinese'),
    ...Array<'malay'>(9).fill('malay'),
    ...Array<'indian'>(9).fill('indian'),
  ];
  return rng.shuffle(list);
}

function staffTitle(rng: SeededRandom, department: DepartmentCode): JobTitle {
  const ladder = DEPARTMENT_TITLES[department].staff;
  // Junior roles are more common than senior ones: bias towards the end of the ladder.
  const index = Math.min(ladder.length - 1, Math.floor(Math.sqrt(rng.next()) * ladder.length));
  return ladder[index] as JobTitle;
}

/**
 * Generates the 120-person synthetic workforce and its cross-system drift.
 * The same seed always produces the same people.
 */
export function generateWorkforce(seed: number = SYNTHETIC_SEED): Workforce {
  const root = new SeededRandom(seed);
  const rng = root.fork('workforce');
  const names = new NamePicker(root.fork('names'));
  const phones = new Set<string>();
  FIXED_PEOPLE.forEach((person) => {
    names.reserve(person.name);
  });

  const drafts: Draft[] = [];
  const sgEthnicities = singaporeEthnicities(root.fork('ethnicity'));
  let sgGenerated = 0;
  let forcedNg = false;

  for (const entity of ['SG01', 'CN01'] as const) {
    for (const [code, count] of Object.entries(HEADCOUNT[entity]) as [DepartmentCode, number][]) {
      const fixed = FIXED_PEOPLE.filter(
        (p) => p.entityCode === entity && p.departmentCode === code,
      );
      const hasFixedHead = fixed.some((p) => p.isHead);
      const isTopDept = code === 'EXEC';
      for (const person of fixed) {
        drafts.push(draftFromFixed(rng, person, phones));
      }
      for (let slot = fixed.length; slot < count; slot += 1) {
        const isHead = !isTopDept && !hasFixedHead && slot === fixed.length;
        const ethnicity =
          entity === 'SG01' ? (sgEthnicities[sgGenerated++] ?? 'chinese') : 'chinese';
        let name = names.next(entity, ethnicity);
        // One Singapore employee romanises 吴 as "Ng": the CN HQ drift shows pinyin "Wu".
        if (entity === 'SG01' && ethnicity === 'chinese' && !forcedNg && !isHead) {
          forcedNg = true;
          name = {
            familyName: 'Ng',
            givenName: name.givenName,
            fullNameLatin: `Ng ${name.givenName}`,
            nameZh: `吴${name.nameZh?.slice(1) ?? ''}`,
          };
          names.reserve(name);
        }
        // Singapore Wealth Management always has two senior relationship managers (one is promoted in the drift).
        const seniorRm =
          entity === 'SG01' && code === 'WM' && !isHead && slot < fixed.length + 2
            ? DEPARTMENT_TITLES.WM.staff[0]
            : undefined;
        const title = isHead ? DEPARTMENT_TITLES[code].head : (seniorRm ?? staffTitle(rng, code));
        const hireDate = hireDateFor(rng, title.grade, isHead);
        drafts.push({
          key: `${entity}-${code}-${slot}`,
          fixedNo: null,
          isHead,
          reportsTo: isHead || isTopDept ? 'top' : 'head',
          entityCode: entity,
          familyName: name.familyName,
          givenName: name.givenName,
          fullNameLatin: name.fullNameLatin,
          nameZh: name.nameZh,
          preferredName: null,
          workPhone: phoneFor(rng, entity, phones),
          departmentCode: code,
          jobTitleEn: title.en,
          jobTitleZh: title.zh,
          jobGrade: title.grade,
          employmentType: 'FULL_TIME',
          employmentStatus: 'ACTIVE',
          hireDate,
          terminationDate: null,
          workLocation: entity === 'SG01' ? 'SG-SIN' : cnLocation(rng),
          costCenter: costCenterFor(entity, code),
          dateOfBirth: dateOfBirthFor(rng, title.grade, hireDate),
          baseSalary: {
            amount: salaryFor(rng, title.grade, entity === 'SG01' ? 'SGD' : 'CNY', false),
            currency: entity === 'SG01' ? 'SGD' : 'CNY',
          },
          ...bankFor(rng, entity),
        });
      }
    }
  }

  applyStatusMix(root.fork('status'), drafts);
  applyPreferredNames(root.fork('preferred'), drafts);
  const employees = assignNumbers(drafts);
  return { employees, drift: generateDrift(root.fork('drift'), employees) };
}

function costCenterFor(entity: EntityCode, code: DepartmentCode): string {
  const order = departmentByCode(code).order;
  return `${entity === 'CN01' ? '1' : '2'}${String(order).padStart(2, '0')}0`;
}

function draftFromFixed(rng: SeededRandom, person: FixedPerson, phones: Set<string>): Draft {
  const currency = person.entityCode === 'SG01' ? 'SGD' : 'CNY';
  return {
    key: person.employeeNo,
    fixedNo: person.employeeNo,
    isHead: person.isHead,
    reportsTo: person.reportsTo,
    entityCode: person.entityCode,
    familyName: person.name.familyName,
    givenName: person.name.givenName,
    fullNameLatin: person.name.fullNameLatin,
    nameZh: person.name.nameZh,
    preferredName: person.preferredName,
    workPhone: phoneFor(rng, person.entityCode, phones),
    departmentCode: person.departmentCode,
    jobTitleEn: person.title.en,
    jobTitleZh: person.title.zh,
    jobGrade: person.title.grade,
    employmentType: 'FULL_TIME',
    employmentStatus: 'ACTIVE',
    hireDate: person.hireDate,
    terminationDate: null,
    workLocation: person.workLocation,
    costCenter: costCenterFor(person.entityCode, person.departmentCode),
    dateOfBirth: person.dateOfBirth,
    baseSalary: { amount: salaryFor(rng, person.title.grade, currency, false), currency },
    ...bankFor(rng, person.entityCode),
  };
}

/**
 * Status and employment-type mix: 3 terminated, 4 on probation, 2 on long leave,
 * a few contract staff, 2 interns and 1 part-timer. Fixed people and heads stay
 * full-time and active.
 */
function applyStatusMix(rng: SeededRandom, drafts: Draft[]): void {
  const eligible = (entity: EntityCode) =>
    drafts.filter((d) => d.entityCode === entity && d.fixedNo === null && !d.isHead);
  const take = (pool: Draft[], n: number): Draft[] => {
    const chosen = rng
      .shuffle(
        pool.filter((d) => d.employmentStatus === 'ACTIVE' && d.employmentType === 'FULL_TIME'),
      )
      .slice(0, n);
    return chosen;
  };
  const setStatus = (d: Draft, status: EmploymentStatus) => {
    d.employmentStatus = status;
  };
  const setType = (d: Draft, type: EmploymentType) => {
    d.employmentType = type;
  };

  const terminations: [EntityCode, string][] = [
    ['SG01', '2026-08-31'],
    ['CN01', '2026-07-31'],
    ['CN01', '2026-09-30'],
  ];
  for (const [entity, date] of terminations) {
    const [person] = take(eligible(entity), 1);
    if (person) {
      setStatus(person, 'TERMINATED');
      person.terminationDate = date;
    }
  }

  const probationHires: [EntityCode, string][] = [
    ['SG01', '2026-07-20'],
    ['SG01', '2026-09-07'],
    ['CN01', '2026-08-03'],
    ['CN01', '2026-10-08'],
  ];
  for (const [entity, date] of probationHires) {
    const [person] = take(eligible(entity), 1);
    if (person) {
      setStatus(person, 'PROBATION');
      person.hireDate = date;
      person.dateOfBirth = dateOfBirthFor(rng, person.jobGrade, date);
    }
  }

  // Long leave (maternity): given names chosen so the record reads naturally.
  const longLeave: [EntityCode, string, string, string][] = [
    ['SG01', 'Shu Ting', '舒婷', 'Shuting'],
    ['CN01', 'Yutong', '雨桐', 'Yutong'],
  ];
  for (const [entity, givenSg, givenZh, givenPinyin] of longLeave) {
    const [person] = take(
      eligible(entity).filter((d) => d.nameZh !== null && d.hireDate < '2025-01-01'),
      1,
    );
    if (person) {
      setStatus(person, 'ON_LEAVE');
      person.givenName = entity === 'SG01' ? givenSg : givenPinyin;
      person.fullNameLatin = `${person.familyName} ${person.givenName}`;
      person.nameZh = `${person.nameZh?.slice(0, 1) ?? ''}${givenZh}`;
    }
  }

  for (const person of take([...eligible('SG01'), ...eligible('CN01')], 5)) {
    setType(person, 'CONTRACT');
  }

  const interns = take(
    eligible('SG01').filter((d) => ['FIN', 'IT', 'OPS'].includes(d.departmentCode)),
    1,
  ).concat(
    take(
      eligible('CN01').filter((d) => ['IT', 'FIN'].includes(d.departmentCode)),
      1,
    ),
  );
  for (const person of interns) {
    const department = departmentByCode(person.departmentCode);
    setType(person, 'INTERN');
    person.jobTitleEn = `${department.nameEn} Intern`;
    person.jobTitleZh = `${department.nameZh.replace(/部$/, '')}实习生`;
    person.jobGrade = 'P1';
    person.hireDate = '2026-06-01';
    person.dateOfBirth = dateOfBirthFor(rng, 'P1', person.hireDate);
    person.baseSalary = {
      amount: salaryFor(rng, 'P1', person.baseSalary.currency, true),
      currency: person.baseSalary.currency,
    };
  }

  const [partTimer] = take(
    eligible('SG01').filter((d) => d.departmentCode === 'ADMIN'),
    1,
  );
  if (partTimer) {
    setType(partTimer, 'PART_TIME');
  }
}

function applyPreferredNames(rng: SeededRandom, drafts: Draft[]): void {
  const candidates = rng
    .shuffle(drafts.filter((d) => d.fixedNo === null && d.nameZh !== null))
    .slice(0, PREFERRED_NAMES.length);
  candidates.forEach((draft, index) => {
    draft.preferredName = PREFERRED_NAMES[index] ?? null;
  });
}

/** Gives generated staff numbers in hire order after the fixed people, then resolves managers. */
function assignNumbers(drafts: Draft[]): SyntheticEmployee[] {
  const generated = drafts
    .filter((d) => d.fixedNo === null)
    .sort(
      (a, b) =>
        a.hireDate.localeCompare(b.hireDate) || a.fullNameLatin.localeCompare(b.fullNameLatin),
    );
  const numbers = new Map<string, string>();
  drafts.filter((d) => d.fixedNo !== null).forEach((d) => numbers.set(d.key, d.fixedNo as string));
  generated.forEach((d, index) => numbers.set(d.key, `E${String(100010 + index)}`));

  const headOf = (entity: EntityCode, code: DepartmentCode): string => {
    const head = drafts.find(
      (d) => d.entityCode === entity && d.departmentCode === code && d.isHead,
    );
    return head ? (numbers.get(head.key) as string) : TOP_EXECUTIVE[entity];
  };

  const emails = new Set<string>();
  const employees = drafts.map((draft): SyntheticEmployee => {
    const employeeNo = numbers.get(draft.key) as string;
    const { key: _key, fixedNo: _fixedNo, isHead: _isHead, reportsTo, ...rest } = draft;
    let managerEmployeeNo: string | null;
    if (reportsTo === 'none') {
      managerEmployeeNo = null;
    } else if (reportsTo === 'top') {
      managerEmployeeNo = TOP_EXECUTIVE[draft.entityCode];
    } else if (reportsTo === 'head') {
      managerEmployeeNo = headOf(draft.entityCode, draft.departmentCode);
    } else {
      managerEmployeeNo = reportsTo;
    }
    const base = `${emailPart(draft.givenName)}.${emailPart(draft.familyName)}`;
    let email = `${base}@orge.example`;
    for (let n = 2; emails.has(email); n += 1) {
      email = `${base}${String(n)}@orge.example`;
    }
    emails.add(email);
    return { employeeNo, managerEmployeeNo, workEmail: email, ...rest };
  });

  return employees.sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));
}

/** True when `date` falls inside the employee's employment (hire to termination). */
export function isEmployedOn(employee: SyntheticEmployee, date: string): boolean {
  if (date < employee.hireDate) {
    return false;
  }
  return employee.terminationDate === null || date <= employee.terminationDate;
}

/** The last day the employee can appear in attendance: termination date or a far-future sentinel. */
export function lastWorkingDay(employee: SyntheticEmployee): string {
  return employee.terminationDate ?? addDays(DATASET_REFERENCE_DATE, 3650);
}
