import { workingDaysBetween } from '@huitong/synthetic-data';

import type { SgHrStore } from '../data/store.js';
import type { SgEmployee, SgLeave } from '../schemas/sg-records.js';
import { toCsv, type CsvColumn } from './csv.js';

/** `2026-07-01` -> `01/07/2026`: the day-first layout of Singapore exports. */
export function sgDate(isoDate: string | null): string | null {
  if (isoDate === null) {
    return null;
  }
  const [year, month, day] = isoDate.split('-');
  return `${day ?? ''}/${month ?? ''}/${year ?? ''}`;
}

const SINGAPORE_DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Singapore',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** The calendar day in Singapore on which an instant fell, as `DD/MM/YYYY`. */
function singaporeDay(instant: string): string {
  return SINGAPORE_DAY.format(new Date(instant));
}

const twoDecimals = (amount: number): string => amount.toFixed(2);

/** Adds the values and rounds the total to two decimal places, so 0.1 + 0.2 reads 0.3. */
const sumToTwoDecimals = (values: readonly number[]): number =>
  Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;

const EMPLOYEE_COLUMNS: readonly CsvColumn<SgEmployee>[] = [
  { header: 'Employee No', value: (e) => e.employeeNo },
  { header: 'Employee Name', value: (e) => e.fullName },
  { header: 'Surname', value: (e) => e.lastName },
  { header: 'Given Name', value: (e) => e.firstName },
  { header: 'Preferred Name', value: (e) => e.preferredName },
  { header: 'Department Code', value: (e) => e.departmentCode },
  { header: 'Department', value: (e) => e.department },
  { header: 'Designation', value: (e) => e.jobTitle },
  { header: 'Employment Type', value: (e) => e.employmentType },
  { header: 'Employee Status', value: (e) => e.status },
  { header: 'Date Joined', value: (e) => sgDate(e.hireDate) },
  { header: 'Date Left', value: (e) => sgDate(e.resignationDate) },
  { header: 'Date of Birth', value: (e) => sgDate(e.dateOfBirth) },
  { header: 'Email', value: (e) => e.email },
  { header: 'Mobile No', value: (e) => e.mobile },
  { header: 'Reporting Officer', value: (e) => e.reportsTo },
  { header: 'Work Location', value: (e) => e.workLocation },
];

interface LeaveRow {
  leave: SgLeave;
  employeeName: string | null;
}

const LEAVE_COLUMNS: readonly CsvColumn<LeaveRow>[] = [
  { header: 'Leave ID', value: (r) => r.leave.leaveId },
  { header: 'Employee No', value: (r) => r.leave.employeeNo },
  { header: 'Employee Name', value: (r) => r.employeeName },
  { header: 'Leave Code', value: (r) => r.leave.leaveType },
  { header: 'Leave Type', value: (r) => r.leave.leaveTypeName },
  { header: 'Date From', value: (r) => sgDate(r.leave.startDate) },
  { header: 'Date To', value: (r) => sgDate(r.leave.endDate) },
  { header: 'No. of Days', value: (r) => r.leave.days },
  { header: 'Half Day', value: (r) => r.leave.halfDay },
  { header: 'Status', value: (r) => r.leave.status },
  { header: 'Applied On', value: (r) => singaporeDay(r.leave.appliedAt) },
];

interface PayrollRow {
  employee: SgEmployee;
  payPeriod: string;
  overtimeHours: number;
  noPayLeaveDays: number;
}

const PAYROLL_COLUMNS: readonly CsvColumn<PayrollRow>[] = [
  { header: 'Pay Period', value: (r) => r.payPeriod },
  { header: 'Employee No', value: (r) => r.employee.employeeNo },
  { header: 'Employee Name', value: (r) => r.employee.fullName },
  { header: 'Department Code', value: (r) => r.employee.departmentCode },
  { header: 'Basic Salary', value: (r) => twoDecimals(r.employee.basicSalary) },
  { header: 'OT Hours', value: (r) => r.overtimeHours },
  { header: 'No-pay Leave Days', value: (r) => r.noPayLeaveDays },
  { header: 'Currency', value: (r) => r.employee.currency },
  { header: 'Bank Name', value: (r) => r.employee.bankName },
  { header: 'Bank Account No', value: (r) => r.employee.bankAccountNo },
];

/** The employee master export: every employee, sorted by number. No pay or bank columns. */
export function employeesExport(store: SgHrStore): string {
  return toCsv(EMPLOYEE_COLUMNS, store.listEmployees());
}

/** Leave that overlaps `from` to `to`, in the mock's leave codes (assumed INFO-TECH-like, A-59). */
export function leaveExport(store: SgHrStore, from: string, to: string): string {
  const rows = store.leaveBetween(from, to).map((leave) => ({
    leave,
    employeeName: store.getEmployee(leave.employeeNo)?.fullName ?? null,
  }));
  return toCsv(LEAVE_COLUMNS, rows);
}

/** `2026-09` -> its first and last calendar days. */
function monthBounds(month: string): { first: string; last: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year ?? 0, monthNumber ?? 0, 0)).getUTCDate();
  return { first: `${month}-01`, last: `${month}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * The days of a leave that fall inside a pay period: all of them when the
 * leave lies inside it (half days included), otherwise its working days in
 * the period, so a leave across a month end is split between the two months.
 */
function daysInside(leave: SgLeave, first: string, last: string): number {
  if (leave.startDate >= first && leave.endDate <= last) {
    return leave.days;
  }
  const from = leave.startDate > first ? leave.startDate : first;
  const to = leave.endDate < last ? leave.endDate : last;
  return workingDaysBetween('SG01', from, to).length;
}

/**
 * The month's payroll summary: one row per employee on the books at any point
 * in the month, with the overtime hours recorded that month and the approved
 * no-pay leave days that fall inside it. It computes no statutory amounts such
 * as CPF.
 */
export function payrollExport(store: SgHrStore, month: string): string {
  const { first, last } = monthBounds(month);
  const [year, monthNumber] = month.split('-');
  const attendance = store.attendanceBetween(first, last);
  const noPayLeave = store
    .leaveBetween(first, last)
    .filter((l) => l.leaveType === 'NPL' && l.status === 'Approved');
  const rows = store
    .listEmployees()
    .filter((e) => e.hireDate <= last && (e.resignationDate === null || e.resignationDate >= first))
    .map((employee) => ({
      employee,
      payPeriod: `${monthNumber ?? ''}/${year ?? ''}`,
      overtimeHours: sumToTwoDecimals(
        attendance.filter((a) => a.employeeNo === employee.employeeNo).map((a) => a.otHours),
      ),
      noPayLeaveDays: sumToTwoDecimals(
        noPayLeave
          .filter((l) => l.employeeNo === employee.employeeNo)
          .map((l) => daysInside(l, first, last)),
      ),
    }));
  return toCsv(PAYROLL_COLUMNS, rows);
}
