import { eachDay, formatClock, isWeekend } from './dates.js';
import { approvedLeaveByDay, generateLeave } from './leave.js';
import { SeededRandom } from './prng.js';
import { DATASET_PERIOD, SYNTHETIC_SEED } from './reference-data.js';
import type { AttendanceStatus, SyntheticAttendance, SyntheticLeave, Workforce } from './types.js';
import { isEmployedOn } from './workforce.js';
import { isPublicHoliday } from './working-days.js';

/** Overtime counts from 18:00, in 15-minute steps, once someone stays past 18:30. */
function overtimeMinutes(clockOutMinutes: number): number {
  const sixPm = 18 * 60;
  if (clockOutMinutes <= sixPm + 30) {
    return 0;
  }
  return Math.floor((clockOutMinutes - sixPm) / 15) * 15;
}

/**
 * Daily attendance for every employee on every weekday they are employed in
 * the period. Approved leave shows as ON_LEAVE (half days shift the clock
 * times), public holidays as PUBLIC_HOLIDAY with no clock times.
 */
export function generateAttendance(
  workforce: Workforce,
  period: { from: string; to: string } = DATASET_PERIOD,
  leave: readonly SyntheticLeave[] = generateLeave(workforce, period),
): SyntheticAttendance[] {
  const rng = new SeededRandom(SYNTHETIC_SEED).fork('attendance');
  const leaveByDay = approvedLeaveByDay(leave);
  const weekdays = eachDay(period.from, period.to).filter((day) => !isWeekend(day));
  const records: SyntheticAttendance[] = [];

  for (const employee of workforce.employees) {
    const remoteChance = employee.entityCode === 'SG01' ? 0.08 : 0.03;
    const leaveDays = leaveByDay.get(employee.employeeNo);
    for (const date of weekdays) {
      if (!isEmployedOn(employee, date)) {
        continue;
      }
      const base = { employeeNo: employee.employeeNo, entityCode: employee.entityCode, date };
      if (isPublicHoliday(employee.entityCode, date)) {
        records.push({
          ...base,
          status: 'PUBLIC_HOLIDAY',
          clockIn: null,
          clockOut: null,
          overtimeMinutes: 0,
        });
        continue;
      }
      const onLeave = leaveDays?.get(date);
      if (onLeave === 'FULL') {
        records.push({
          ...base,
          status: 'ON_LEAVE',
          clockIn: null,
          clockOut: null,
          overtimeMinutes: 0,
        });
        continue;
      }
      let status: AttendanceStatus;
      let inMinutes: number;
      let outMinutes: number;
      if (onLeave === 'AM') {
        status = 'PRESENT';
        inMinutes = rng.int(13 * 60 + 30, 14 * 60);
        outMinutes = rng.int(18 * 60, 18 * 60 + 45);
      } else if (onLeave === 'PM') {
        status = 'PRESENT';
        inMinutes = rng.int(8 * 60 + 45, 9 * 60 + 15);
        outMinutes = rng.int(12 * 60 + 30, 13 * 60);
      } else {
        const roll = rng.next();
        if (roll < 0.01) {
          records.push({
            ...base,
            status: 'ABSENT',
            clockIn: null,
            clockOut: null,
            overtimeMinutes: 0,
          });
          continue;
        }
        if (roll < 0.01 + remoteChance) {
          status = 'REMOTE';
          inMinutes = rng.int(8 * 60 + 45, 9 * 60 + 30);
          outMinutes = rng.int(17 * 60 + 30, 18 * 60 + 30);
        } else if (roll < 0.07 + remoteChance) {
          status = 'LATE';
          inMinutes = rng.int(9 * 60 + 31, 10 * 60 + 20);
          outMinutes = rng.int(18 * 60, 19 * 60 + 30);
        } else if (roll < 0.09 + remoteChance) {
          status = 'EARLY_LEAVE';
          inMinutes = rng.int(8 * 60 + 30, 9 * 60 + 15);
          outMinutes = rng.int(15 * 60 + 30, 16 * 60 + 50);
        } else {
          status = 'PRESENT';
          inMinutes = rng.int(8 * 60 + 30, 9 * 60 + 25);
          outMinutes = rng.int(17 * 60 + 40, 19 * 60 + 30);
        }
      }
      records.push({
        ...base,
        status,
        clockIn: formatClock(inMinutes),
        clockOut: formatClock(outMinutes),
        overtimeMinutes: overtimeMinutes(outMinutes),
      });
    }
  }
  return records;
}
