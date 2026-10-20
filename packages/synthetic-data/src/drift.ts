import { addDays } from './dates.js';
import { DEPARTMENT_TITLES } from './job-titles.js';
import type { SeededRandom } from './prng.js';
import type {
  CrossSystemDrift,
  DepartmentCode,
  DriftSystem,
  EmploymentStatus,
  SyntheticEmployee,
} from './types.js';

/** One month later on the same day, clamped so the date stays valid. */
function oneMonthLater(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const date = `${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`;
  return date === iso ? addDays(iso, 30) : date;
}

/**
 * The eight deliberate discrepancies between SG HR and CN HQ, all on Singapore
 * staff. Four affect fields with no single owner (department, hire date, email,
 * job title) and open conflicts for HR; the other four affect fields SG HR owns
 * and are resolved by the source-of-truth policy.
 */
export function generateDrift(
  rng: SeededRandom,
  employees: readonly SyntheticEmployee[],
): CrossSystemDrift[] {
  const sgStaff = employees.filter(
    (e) => e.entityCode === 'SG01' && Number(e.employeeNo.slice(1)) >= 100010,
  );
  const leaver = sgStaff.find((e) => e.employmentStatus === 'TERMINATED');
  const romanised = sgStaff.find((e) => e.familyName === 'Ng');
  if (!leaver || !romanised) {
    throw new Error('The workforce needs a Singapore leaver and a Singapore employee surnamed Ng');
  }
  // Reserved up front so no person carries more than one discrepancy.
  const taken = new Set<string>(['E100003', leaver.employeeNo, romanised.employeeNo]);
  const pick = (candidates: SyntheticEmployee[], label: string): SyntheticEmployee => {
    const available = candidates.filter((e) => !taken.has(e.employeeNo));
    const chosen = rng.pick(available.length > 0 ? available : candidates);
    if (taken.has(chosen.employeeNo)) {
      throw new Error(`No unique candidate left for ${label} drift`);
    }
    taken.add(chosen.employeeNo);
    return chosen;
  };
  const active = sgStaff.filter((e) => e.employmentStatus === 'ACTIVE');
  const drift: CrossSystemDrift[] = [];

  const transferred = pick(
    active.filter((e) => e.departmentCode === 'COMP' && !e.jobTitleEn.startsWith('Head')),
    'department',
  );
  drift.push({
    employeeNo: transferred.employeeNo,
    field: 'departmentCode',
    system: 'cn-hq',
    value: 'OPS',
    note: 'Moved from Operations to Compliance in August; SG HR has the transfer but HQ still shows Operations.',
  });

  const misdated = pick(active, 'hire date');
  drift.push({
    employeeNo: misdated.employeeNo,
    field: 'hireDate',
    system: 'cn-hq',
    value: oneMonthLater(misdated.hireDate),
    note: 'HQ keyed the start date one month late when the hire was copied into SAP by hand.',
  });

  drift.push({
    employeeNo: 'E100003',
    field: 'workPhone',
    system: 'cn-hq',
    value: '+6581234570',
    note: 'Mei Ling changed her work mobile; SG HR is up to date, HQ still has the old number.',
  });

  const renamedEmail = pick(
    active.filter((e) => e.nameZh !== null),
    'email',
  );
  drift.push({
    employeeNo: renamedEmail.employeeNo,
    field: 'workEmail',
    system: 'sg-hr',
    value: renamedEmail.workEmail.replace('.', ''),
    note: 'HQ IT reissued the address in the standard firstname.lastname format; SG HR still holds the old one.',
  });

  drift.push({
    employeeNo: leaver.employeeNo,
    field: 'employmentStatus',
    system: 'cn-hq',
    value: 'ACTIVE',
    note: 'Left at the end of August; offboarding never reached HQ, so SAP still shows the person as active.',
  });

  const reassigned = pick(
    active.filter(
      (e) =>
        e.departmentCode === 'IT' && !e.jobTitleEn.startsWith('Head') && e.employeeNo !== 'E100008',
    ),
    'manager',
  );
  drift.push({
    employeeNo: reassigned.employeeNo,
    field: 'managerEmployeeNo',
    system: 'cn-hq',
    value: 'E100008',
    note: 'Reporting line moved from the IT systems administrator to the head of technology; HQ has the old manager.',
  });

  drift.push({
    employeeNo: romanised.employeeNo,
    field: 'familyName',
    system: 'cn-hq',
    value: 'Wu',
    note: 'The same surname 吴 is romanised "Ng" in Singapore and "Wu" in pinyin at HQ.',
  });

  const promoted = pick(
    active.filter(
      (e) => e.departmentCode === 'WM' && e.jobTitleEn === 'Senior Relationship Manager',
    ),
    'title',
  );
  const previous = DEPARTMENT_TITLES.WM.staff.find((t) => t.en === 'Relationship Manager');
  drift.push({
    employeeNo: promoted.employeeNo,
    field: 'jobTitleEn',
    system: 'cn-hq',
    value: previous?.en ?? 'Relationship Manager',
    note: 'Promoted to Senior Relationship Manager in September; HQ has not applied the promotion yet.',
  });

  return drift;
}

/** The previous Chinese title for a title drift, so CN HQ stays internally consistent. */
export function driftTitleZh(value: string): string | null {
  for (const titles of Object.values(DEPARTMENT_TITLES)) {
    const match = [titles.head, ...titles.staff].find((t) => t.en === value);
    if (match) {
      return match.zh;
    }
  }
  return null;
}

const DEPARTMENT_CODES: readonly DepartmentCode[] = [
  'EXEC',
  'FIN',
  'HR',
  'COMP',
  'RISK',
  'IT',
  'OPS',
  'WM',
  'CB',
  'ADMIN',
  'LEGAL',
];
const STATUSES: readonly EmploymentStatus[] = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED'];

/**
 * The employee as one source system holds it: ground truth with that system's
 * drift laid over it. Related fields move together, so the record stays
 * internally consistent (an "active" leaver has no termination date; a stale
 * English title comes with its matching Chinese title).
 */
export function employeeAsSeenBy(
  employee: SyntheticEmployee,
  drift: readonly CrossSystemDrift[],
  system: DriftSystem,
): SyntheticEmployee {
  const seen: SyntheticEmployee = { ...employee };
  for (const entry of drift) {
    if (entry.employeeNo !== employee.employeeNo || entry.system !== system) {
      continue;
    }
    switch (entry.field) {
      case 'departmentCode': {
        const code = DEPARTMENT_CODES.find((c) => c === entry.value);
        if (code) {
          seen.departmentCode = code;
        }
        break;
      }
      case 'employmentStatus': {
        const status = STATUSES.find((s) => s === entry.value);
        if (status) {
          seen.employmentStatus = status;
          if (status !== 'TERMINATED') {
            seen.terminationDate = null;
          }
        }
        break;
      }
      case 'jobTitleEn':
        seen.jobTitleEn = entry.value;
        seen.jobTitleZh = driftTitleZh(entry.value) ?? seen.jobTitleZh;
        break;
      case 'familyName':
        seen.familyName = entry.value;
        break;
      case 'hireDate':
        seen.hireDate = entry.value;
        break;
      case 'workPhone':
        seen.workPhone = entry.value;
        break;
      case 'workEmail':
        seen.workEmail = entry.value;
        break;
      case 'managerEmployeeNo':
        seen.managerEmployeeNo = entry.value;
        break;
    }
  }
  return seen;
}
