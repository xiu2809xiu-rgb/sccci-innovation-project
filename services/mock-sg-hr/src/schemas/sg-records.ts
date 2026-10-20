import { z } from 'zod';

const isoDate = z.iso.date();

/** An employee as the Singapore HR system returns it: English keys, ISO dates. */
export const sgEmployeeSchema = z.strictObject({
  employeeNo: z.string().regex(/^E\d{6}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  /** The name as written in the person's culture, as on their identity card (family-first or given-first). */
  fullName: z.string().min(1),
  preferredName: z.string().nullable(),
  email: z.email(),
  mobile: z.string().regex(/^\+65 \d{4} \d{4}$/),
  department: z.string().min(1),
  departmentCode: z.string().regex(/^SG-[A-Z]+$/),
  jobTitle: z.string().min(1),
  employmentType: z.enum(['Permanent', 'Contract', 'Part-Time', 'Intern']),
  status: z.enum(['Active', 'Probation', 'On Leave', 'Resigned']),
  hireDate: isoDate,
  resignationDate: isoDate.nullable(),
  dateOfBirth: isoDate,
  basicSalary: z.number().nonnegative(),
  currency: z.literal('SGD'),
  bankName: z.string().min(1),
  bankAccountNo: z.string().regex(/^[\d-]+$/),
  workLocation: z.literal('Singapore'),
  reportsTo: z
    .string()
    .regex(/^E\d{6}$/)
    .nullable(),
  lastModified: z.iso.datetime(),
});

export type SgEmployee = z.infer<typeof sgEmployeeSchema>;

/** Body of `POST /api/employees`: everything except the server-managed timestamp. */
export const sgEmployeeCreateSchema = sgEmployeeSchema.omit({ lastModified: true });

/** Body of `PATCH /api/employees/:employeeNo`: any subset, but the key itself cannot change. */
export const sgEmployeePatchSchema = sgEmployeeCreateSchema.omit({ employeeNo: true }).partial();

export const sgAttendanceSchema = z.strictObject({
  employeeNo: z.string(),
  date: isoDate,
  clockIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  clockOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  status: z.enum(['Present', 'Late', 'Absent', 'On Leave', 'Remote', 'Public Holiday']),
  otHours: z.number().nonnegative(),
});

export type SgAttendance = z.infer<typeof sgAttendanceSchema>;

export const sgLeaveSchema = z.strictObject({
  leaveId: z.string().regex(/^LV-SG-\d{6}$/),
  employeeNo: z.string(),
  leaveType: z.string(),
  leaveTypeName: z.string(),
  startDate: isoDate,
  endDate: isoDate,
  days: z.number().positive(),
  halfDay: z.enum(['AM', 'PM']).nullable(),
  status: z.enum(['Approved', 'Pending', 'Cancelled']),
  appliedAt: z.iso.datetime(),
});

export type SgLeave = z.infer<typeof sgLeaveSchema>;

export const SG_LEAVE_TYPES = [
  { code: 'AL', name: 'Annual Leave' },
  { code: 'SL', name: 'Sick Leave (Outpatient)' },
  { code: 'HL', name: 'Hospitalisation Leave' },
  { code: 'CCL', name: 'Childcare Leave' },
  { code: 'ML', name: 'Maternity Leave' },
  { code: 'PL', name: 'Paternity Leave' },
  { code: 'CL', name: 'Compassionate Leave' },
  { code: 'TOIL', name: 'Time-off in Lieu' },
  { code: 'NPL', name: 'No-pay Leave' },
] as const;
