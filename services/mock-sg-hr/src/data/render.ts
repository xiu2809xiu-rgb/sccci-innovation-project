import {
  departmentByCode,
  employeeAsSeenBy,
  type CrossSystemDrift,
  type SyntheticAttendance,
  type SyntheticEmployee,
  type SyntheticLeave,
} from '@huitong/synthetic-data';

import {
  SG_LEAVE_TYPES,
  type SgAttendance,
  type SgEmployee,
  type SgLeave,
} from '../schemas/sg-records.js';

const EMPLOYMENT_TYPES: Record<SyntheticEmployee['employmentType'], SgEmployee['employmentType']> =
  {
    FULL_TIME: 'Permanent',
    CONTRACT: 'Contract',
    PART_TIME: 'Part-Time',
    INTERN: 'Intern',
  };

const STATUSES: Record<SyntheticEmployee['employmentStatus'], SgEmployee['status']> = {
  ACTIVE: 'Active',
  PROBATION: 'Probation',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Resigned',
};

const ATTENDANCE_STATUSES: Record<SyntheticAttendance['status'], SgAttendance['status']> = {
  PRESENT: 'Present',
  LATE: 'Late',
  // SG HR has no early-leave status: the short day shows only in the clock times.
  EARLY_LEAVE: 'Present',
  ABSENT: 'Absent',
  ON_LEAVE: 'On Leave',
  REMOTE: 'Remote',
  PUBLIC_HOLIDAY: 'Public Holiday',
};

const LEAVE_STATUSES: Record<SyntheticLeave['status'], SgLeave['status']> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
};

/** `+6591234567` -> `+65 9123 4567`, the display format SG HR stores. */
function displayMobile(e164: string): string {
  const digits = e164.slice(3);
  return `+65 ${digits.slice(0, 4)} ${digits.slice(4)}`;
}

/** Synthetic account digits in the dashed style SG HR displays. */
function dashedAccount(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 9)}-${digits.slice(9)}`;
}

/**
 * Renders ground truth into SG HR's schema, applying the drift entries that
 * belong to SG HR. `lastModified` is recent for employees whose records drift,
 * because those are the records someone changed lately.
 */
export function renderSgEmployee(
  truth: SyntheticEmployee,
  drift: readonly CrossSystemDrift[],
): SgEmployee {
  const employee = employeeAsSeenBy(truth, drift, 'sg-hr');
  const department = departmentByCode(employee.departmentCode);
  const touched = drift.some((d) => d.employeeNo === truth.employeeNo);
  return {
    employeeNo: employee.employeeNo,
    firstName: employee.givenName,
    lastName: employee.familyName,
    preferredName: employee.preferredName,
    email: employee.workEmail,
    mobile: displayMobile(employee.workPhone),
    department: department.nameEn,
    departmentCode: department.sgCode ?? `SG-${department.code}`,
    jobTitle: employee.jobTitleEn,
    employmentType: EMPLOYMENT_TYPES[employee.employmentType],
    status: STATUSES[employee.employmentStatus],
    hireDate: employee.hireDate,
    resignationDate: employee.terminationDate,
    dateOfBirth: employee.dateOfBirth,
    basicSalary: employee.baseSalary.amount,
    currency: 'SGD',
    bankName: employee.bankName,
    bankAccountNo: dashedAccount(employee.bankAccountNumber),
    workLocation: 'Singapore',
    reportsTo: employee.managerEmployeeNo,
    lastModified: touched
      ? '2026-10-12T03:15:00Z'
      : `${employee.hireDate > '2026-01-05' ? employee.hireDate : '2026-01-05'}T02:00:00Z`,
  };
}

export function renderSgAttendance(record: SyntheticAttendance): SgAttendance {
  return {
    employeeNo: record.employeeNo,
    date: record.date,
    clockIn: record.clockIn,
    clockOut: record.clockOut,
    status: ATTENDANCE_STATUSES[record.status],
    otHours: record.overtimeMinutes / 60,
  };
}

export function renderSgLeave(record: SyntheticLeave): SgLeave {
  const type = SG_LEAVE_TYPES.find((t) => t.code === record.sourceCode);
  if (!type) {
    throw new Error(`Leave ${record.leaveId} is not an SG HR category`);
  }
  return {
    leaveId: record.leaveId,
    employeeNo: record.employeeNo,
    leaveType: type.code,
    leaveTypeName: type.name,
    startDate: record.startDate,
    endDate: record.endDate,
    days: record.days,
    halfDay: record.halfDay,
    status: LEAVE_STATUSES[record.status],
    appliedAt: record.appliedAt,
  };
}
