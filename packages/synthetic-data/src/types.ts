/** Public types of the synthetic dataset. Field names are canonical-ish English; the mocks translate them. */

export type EntityCode = 'SG01' | 'CN01';

export type DepartmentCode =
  'EXEC' | 'FIN' | 'HR' | 'COMP' | 'RISK' | 'IT' | 'OPS' | 'WM' | 'CB' | 'ADMIN' | 'LEGAL';

export type WorkLocationCode = 'SG-SIN' | 'CN-SHA' | 'CN-PEK' | 'CN-SZX';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export type EmploymentStatus = 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED';

export interface Entity {
  code: EntityCode;
  name: string;
  nameZh: string;
  country: 'SG' | 'CN';
  currency: 'SGD' | 'CNY';
  timezone: string;
}

export interface Department {
  code: DepartmentCode;
  nameEn: string;
  nameZh: string;
  /** SG HR's own department code, or null when the department does not exist in Singapore. */
  sgCode: string | null;
  /** SAP-like 8-digit organisational unit used by China HQ. */
  sapOrgUnit: string;
  /** Position used to derive cost centres. */
  order: number;
}

export interface WorkLocation {
  code: WorkLocationCode;
  nameEn: string;
  nameZh: string;
}

export interface Money {
  amount: number;
  currency: 'SGD' | 'CNY';
}

/** Ground truth for one synthetic employee. */
export interface SyntheticEmployee {
  employeeNo: string;
  entityCode: EntityCode;
  familyName: string;
  givenName: string;
  /** The name as written in the person's culture (family-first or given-first). */
  fullNameLatin: string;
  nameZh: string | null;
  preferredName: string | null;
  workEmail: string;
  /** E.164, e.g. `+6591234567`. */
  workPhone: string;
  departmentCode: DepartmentCode;
  jobTitleEn: string;
  jobTitleZh: string;
  jobGrade: string;
  managerEmployeeNo: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  terminationDate: string | null;
  workLocation: WorkLocationCode;
  costCenter: string;
  dateOfBirth: string;
  baseSalary: Money;
  bankName: string;
  bankAccountNumber: string;
}

export type DriftField =
  | 'departmentCode'
  | 'hireDate'
  | 'workPhone'
  | 'workEmail'
  | 'employmentStatus'
  | 'managerEmployeeNo'
  | 'familyName'
  | 'jobTitleEn';

export type DriftSystem = 'sg-hr' | 'cn-hq';

/**
 * A deliberate difference: `system` shows `value` for `field` instead of the
 * ground truth. The other system shows the truth.
 */
export interface CrossSystemDrift {
  employeeNo: string;
  field: DriftField;
  system: DriftSystem;
  value: string;
  note: string;
}

export interface Workforce {
  employees: SyntheticEmployee[];
  drift: CrossSystemDrift[];
}

export type AttendanceStatus =
  'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'ON_LEAVE' | 'REMOTE' | 'PUBLIC_HOLIDAY';

export interface SyntheticAttendance {
  employeeNo: string;
  entityCode: EntityCode;
  date: string;
  status: AttendanceStatus;
  /** `HH:mm`, or null when nobody clocked in. */
  clockIn: string | null;
  clockOut: string | null;
  overtimeMinutes: number;
}

/** Leave category codes as each source system names them. */
export type SgLeaveCode = 'AL' | 'SL' | 'HL' | 'CCL' | 'ML' | 'PL' | 'CL' | 'TOIL' | 'NPL';

export type CnLeaveCode = 'NJ' | 'BJ' | 'SJ' | 'TX' | 'HJ' | 'CJ' | 'PCJ' | 'SANG' | 'YEJ' | 'TQJ';

export type LeaveStatus = 'APPROVED' | 'PENDING' | 'CANCELLED';

export interface SyntheticLeave {
  leaveId: string;
  employeeNo: string;
  entityCode: EntityCode;
  /** The source system's own category code (SG codes for SG01, CN codes for CN01). */
  sourceCode: SgLeaveCode | CnLeaveCode;
  startDate: string;
  endDate: string;
  /** Working days taken, in halves. */
  days: number;
  halfDay: 'AM' | 'PM' | null;
  status: LeaveStatus;
  appliedAt: string;
}

export type ApprovalType =
  'MANPOWER_REQUEST' | 'OFFICE_RENTAL' | 'EXPENSE_CLAIM' | 'IT_ASSET_PURCHASE' | 'PAYMENT_APPROVAL';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export type ApprovalAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PENDING';

export interface ApprovalStep {
  node: string;
  approverEmployeeNo: string;
  approverName: string;
  action: ApprovalAction;
  at: string | null;
  comment: string | null;
}

/** An OA request. `formData` uses the OA product's Chinese field names. */
export interface SyntheticApproval {
  requestId: string;
  type: ApprovalType;
  title: string;
  status: ApprovalStatus;
  applicantEmployeeNo: string;
  entityCode: EntityCode;
  submittedAt: string;
  completedAt: string | null;
  formData: Record<string, string | number>;
  chain: ApprovalStep[];
}
