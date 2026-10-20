import { addDays } from './dates.js';
import { SeededRandom } from './prng.js';
import { DATASET_PERIOD, SYNTHETIC_SEED } from './reference-data.js';
import type {
  CnLeaveCode,
  EntityCode,
  SgLeaveCode,
  SyntheticEmployee,
  SyntheticLeave,
  Workforce,
} from './types.js';
import { isWorkingDay, workingDaysBetween } from './working-days.js';

type LeaveCode = SgLeaveCode | CnLeaveCode;

interface CategoryRule {
  code: LeaveCode;
  weight: number;
  minDays: number;
  maxDays: number;
  halfDayChance: number;
}

/** Everyday categories, weighted by how often each is taken. */
const EVERYDAY_RULES: Readonly<Record<EntityCode, readonly CategoryRule[]>> = {
  SG01: [
    { code: 'AL', weight: 50, minDays: 1, maxDays: 5, halfDayChance: 0.2 },
    { code: 'SL', weight: 20, minDays: 1, maxDays: 2, halfDayChance: 0 },
    { code: 'TOIL', weight: 10, minDays: 1, maxDays: 1, halfDayChance: 0.4 },
    { code: 'CCL', weight: 6, minDays: 1, maxDays: 2, halfDayChance: 0.2 },
    { code: 'NPL', weight: 3, minDays: 1, maxDays: 2, halfDayChance: 0 },
  ],
  CN01: [
    { code: 'NJ', weight: 45, minDays: 1, maxDays: 5, halfDayChance: 0.2 },
    { code: 'BJ', weight: 20, minDays: 1, maxDays: 2, halfDayChance: 0 },
    { code: 'TX', weight: 15, minDays: 1, maxDays: 1, halfDayChance: 0.4 },
    { code: 'SJ', weight: 8, minDays: 1, maxDays: 2, halfDayChance: 0.2 },
  ],
};

/** Rare categories that must appear, each on a different employee, with a working-day length. */
const GUARANTEED: Readonly<Record<EntityCode, readonly { code: LeaveCode; days: number }[]>> = {
  SG01: [
    { code: 'PL', days: 10 },
    { code: 'HL', days: 4 },
    { code: 'CL', days: 2 },
  ],
  CN01: [
    { code: 'HJ', days: 10 },
    { code: 'PCJ', days: 10 },
    { code: 'TQJ', days: 20 },
    { code: 'SANG', days: 3 },
    { code: 'YEJ', days: 5 },
  ],
};

/** Maternity leave for the two employees whose status is ON_LEAVE. */
const LONG_LEAVE: Readonly<
  Record<EntityCode, { code: LeaveCode; start: string; calendarDays: number }>
> = {
  SG01: { code: 'ML', start: '2026-08-03', calendarDays: 112 },
  CN01: { code: 'CJ', start: '2026-07-06', calendarDays: 158 },
};

function weightedPick(rng: SeededRandom, rules: readonly CategoryRule[]): CategoryRule {
  const total = rules.reduce((sum, rule) => sum + rule.weight, 0);
  let roll = rng.next() * total;
  for (const rule of rules) {
    roll -= rule.weight;
    if (roll < 0) {
      return rule;
    }
  }
  return rules[rules.length - 1] as CategoryRule;
}

/** The part of the period during which the employee is employed, or null. */
function employedWindow(
  employee: SyntheticEmployee,
  period: { from: string; to: string },
): { from: string; to: string } | null {
  const from = employee.hireDate > period.from ? employee.hireDate : period.from;
  const end = employee.terminationDate ?? period.to;
  const to = end < period.to ? end : period.to;
  return from <= to ? { from, to } : null;
}

class LeaveIdSequence {
  private sg = 0;
  private readonly cnByMonth = new Map<string, number>();

  next(entity: EntityCode, startDate: string): string {
    if (entity === 'SG01') {
      this.sg += 1;
      return `LV-SG-${String(this.sg).padStart(6, '0')}`;
    }
    const month = startDate.slice(0, 7).replace('-', '');
    const count = (this.cnByMonth.get(month) ?? 0) + 1;
    this.cnByMonth.set(month, count);
    return `QJ${month}${String(count).padStart(4, '0')}`;
  }
}

interface Booking {
  employee: SyntheticEmployee;
  code: LeaveCode;
  days: string[];
  halfDay: 'AM' | 'PM' | null;
  calendarEnd: string | null;
}

/**
 * Generates leave for every employee employed during the period. Leave never
 * overlaps for one person, counts working days only, and uses each source
 * system's own category codes.
 */
export function generateLeave(
  workforce: Workforce,
  period: { from: string; to: string } = DATASET_PERIOD,
): SyntheticLeave[] {
  const rng = new SeededRandom(SYNTHETIC_SEED).fork('leave');
  const bookings: Booking[] = [];
  const occupied = new Map<string, Set<string>>();

  const tryBook = (booking: Booking): boolean => {
    const taken = occupied.get(booking.employee.employeeNo) ?? new Set<string>();
    if (booking.days.length === 0 || booking.days.some((day) => taken.has(day))) {
      return false;
    }
    booking.days.forEach((day) => taken.add(day));
    occupied.set(booking.employee.employeeNo, taken);
    bookings.push(booking);
    return true;
  };

  const consecutiveWorkingDays = (
    entity: EntityCode,
    start: string,
    count: number,
    until: string,
  ): string[] => {
    const days: string[] = [];
    for (let day = start; days.length < count && day <= until; day = addDays(day, 1)) {
      if (isWorkingDay(entity, day)) {
        days.push(day);
      }
    }
    return days;
  };

  for (const entity of ['SG01', 'CN01'] as const) {
    const staff = workforce.employees.filter((e) => e.entityCode === entity);

    for (const employee of staff.filter((e) => e.employmentStatus === 'ON_LEAVE')) {
      const long = LONG_LEAVE[entity];
      const calendarEnd = addDays(long.start, long.calendarDays - 1);
      tryBook({
        employee,
        code: long.code,
        days: workingDaysBetween(entity, long.start, calendarEnd),
        halfDay: null,
        calendarEnd,
      });
    }

    const fullPeriodStaff = rng.shuffle(
      staff.filter((e) => e.employmentStatus === 'ACTIVE' && e.hireDate <= period.from),
    );
    GUARANTEED[entity].forEach((rare, index) => {
      const employee = fullPeriodStaff[index];
      if (!employee) {
        return;
      }
      const workdays = workingDaysBetween(entity, period.from, period.to);
      const start =
        workdays[rng.int(0, Math.max(0, workdays.length - rare.days - 1))] ?? period.from;
      tryBook({
        employee,
        code: rare.code,
        days: consecutiveWorkingDays(entity, start, rare.days, period.to),
        halfDay: null,
        calendarEnd: null,
      });
    });

    for (const employee of staff) {
      if (employee.employmentStatus === 'ON_LEAVE') {
        continue;
      }
      const window = employedWindow(employee, period);
      if (!window) {
        continue;
      }
      const workdays = workingDaysBetween(entity, window.from, window.to);
      const roll = rng.next();
      const episodes = roll < 0.25 ? 0 : roll < 0.65 ? 1 : roll < 0.9 ? 2 : 3;
      for (let i = 0; i < episodes && workdays.length > 0; i += 1) {
        const rule = weightedPick(rng, EVERYDAY_RULES[entity]);
        const start = workdays[rng.int(0, workdays.length - 1)] as string;
        const halfDay = rng.chance(rule.halfDayChance) ? rng.pick(['AM', 'PM'] as const) : null;
        const length = halfDay ? 1 : rng.int(rule.minDays, rule.maxDays);
        tryBook({
          employee,
          code: rule.code,
          days: consecutiveWorkingDays(entity, start, length, window.to),
          halfDay,
          calendarEnd: null,
        });
      }
    }
  }

  const ids = new LeaveIdSequence();
  return bookings
    .sort(
      (a, b) =>
        (a.days[0] ?? '').localeCompare(b.days[0] ?? '') ||
        a.employee.employeeNo.localeCompare(b.employee.employeeNo),
    )
    .map((booking): SyntheticLeave => {
      const startDate = booking.days[0] as string;
      const endDate = booking.calendarEnd ?? (booking.days[booking.days.length - 1] as string);
      const appliedAt = `${addDays(startDate, -rng.int(3, 21))}T0${String(rng.int(1, 8))}:${String(rng.int(10, 59))}:00Z`;
      const recent = startDate >= addDays(period.to, -10);
      const status =
        recent && rng.chance(0.35) ? 'PENDING' : rng.chance(0.03) ? 'CANCELLED' : 'APPROVED';
      return {
        leaveId: ids.next(booking.employee.entityCode, startDate),
        employeeNo: booking.employee.employeeNo,
        entityCode: booking.employee.entityCode,
        sourceCode: booking.code,
        startDate,
        endDate,
        days: booking.halfDay ? 0.5 : booking.days.length,
        halfDay: booking.halfDay,
        status,
        appliedAt,
      };
    });
}

/** Approved leave per employee and date: a full day or the half (AM or PM) taken. */
export function approvedLeaveByDay(
  leave: readonly SyntheticLeave[],
): Map<string, Map<string, 'FULL' | 'AM' | 'PM'>> {
  const byEmployee = new Map<string, Map<string, 'FULL' | 'AM' | 'PM'>>();
  for (const record of leave) {
    if (record.status !== 'APPROVED') {
      continue;
    }
    const days = byEmployee.get(record.employeeNo) ?? new Map<string, 'FULL' | 'AM' | 'PM'>();
    for (const day of workingDaysBetween(record.entityCode, record.startDate, record.endDate)) {
      days.set(day, record.halfDay ?? 'FULL');
    }
    byEmployee.set(record.employeeNo, days);
  }
  return byEmployee;
}
