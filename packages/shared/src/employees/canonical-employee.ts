import { z } from 'zod';

import { type EmployeeField } from '../governance/classification.js';
import { departmentCodeSchema } from '../org/departments.js';
import { entityCodeSchema } from '../org/entities.js';
import { workLocationSchema } from '../org/work-locations.js';
import { employmentStatusSchema, employmentTypeSchema } from './employment.js';

/** HQ's global internal employee number, the match key across systems. Never a national ID. */
export const employeeNoSchema = z.string().regex(/^E\d{6}$/, 'an employee number such as E100023');

export type EmployeeNo = z.infer<typeof employeeNoSchema>;

export const CURRENCIES = ['SGD', 'CNY', 'MYR'] as const;

export const moneySchema = z.object({
  amount: z.number().nonnegative().max(100_000_000),
  currency: z.enum(CURRENCIES),
});

export type Money = z.infer<typeof moneySchema>;

/** E.164, as every source's phone format is normalised to (`+6591234567`). */
export const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'an E.164 phone number');

/**
 * One employee in the canonical model (facts sheet section 6). Every connector's
 * mapping produces a partial version of this; the master holds the merged record.
 */
export const canonicalEmployeeSchema = z.object({
  employeeNo: employeeNoSchema,
  entityCode: entityCodeSchema,
  familyName: z.string().trim().min(1).max(100),
  givenName: z.string().trim().min(1).max(100),
  fullNameLatin: z.string().trim().min(1).max(200),
  fullNameLocal: z.string().trim().min(1).max(100).nullable(),
  preferredName: z.string().trim().min(1).max(100).nullable(),
  workEmail: z.email().max(254),
  workPhone: e164PhoneSchema.nullable(),
  departmentCode: departmentCodeSchema,
  jobTitle: z.string().trim().min(1).max(200),
  jobTitleZh: z.string().trim().min(1).max(200).nullable(),
  jobGrade: z.string().trim().min(1).max(20).nullable(),
  managerEmployeeNo: employeeNoSchema.nullable(),
  employmentType: employmentTypeSchema,
  employmentStatus: employmentStatusSchema,
  hireDate: z.iso.date(),
  terminationDate: z.iso.date().nullable(),
  workLocation: workLocationSchema,
  costCenter: z.string().trim().min(1).max(20).nullable(),
  dateOfBirth: z.iso.date().nullable(),
  baseSalary: moneySchema.nullable(),
  bankName: z.string().trim().min(1).max(100).nullable(),
  /** Data minimisation: the full account number stays in the payroll system of record. */
  bankAccountLast4: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
});

export type CanonicalEmployee = z.infer<typeof canonicalEmployeeSchema>;

/** What one source contributes: any subset of the canonical fields, each validated. */
export const canonicalEmployeePartialSchema = canonicalEmployeeSchema.partial();

export type CanonicalEmployeePartial = z.infer<typeof canonicalEmployeePartialSchema>;

/** Fields a source must provide before the master can create a new employee from it. */
export const REQUIRED_EMPLOYEE_FIELDS = [
  'employeeNo',
  'entityCode',
  'familyName',
  'givenName',
  'fullNameLatin',
  'workEmail',
  'departmentCode',
  'jobTitle',
  'employmentType',
  'employmentStatus',
  'hireDate',
  'workLocation',
] as const satisfies readonly EmployeeField[];

/** Identity fields: they select the record and are never merged or put in conflict. */
export const IDENTITY_FIELDS = [
  'employeeNo',
  'entityCode',
] as const satisfies readonly EmployeeField[];
