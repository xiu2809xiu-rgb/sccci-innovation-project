import type { CanonicalEmployee, CanonicalEmployeePartial, EmployeeField } from '@huitong/shared';

import { Prisma, type Employee } from '../../generated/prisma/client.js';

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const toDate = (value: string | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(`${value}T00:00:00.000Z`);

/** The canonical value of every field of a master row (dates as ISO, money as one object). */
export function canonicalOf(row: Employee): Record<EmployeeField, unknown> {
  return {
    employeeNo: row.employeeNo,
    entityCode: row.entityCode,
    familyName: row.familyName,
    givenName: row.givenName,
    fullNameLatin: row.fullNameLatin,
    fullNameLocal: row.fullNameLocal,
    preferredName: row.preferredName,
    workEmail: row.workEmail,
    workPhone: row.workPhone,
    departmentCode: row.departmentCode,
    jobTitle: row.jobTitle,
    jobTitleZh: row.jobTitleZh,
    jobGrade: row.jobGrade,
    managerEmployeeNo: row.managerEmployeeNo,
    employmentType: row.employmentType,
    employmentStatus: row.employmentStatus,
    hireDate: isoDate(row.hireDate),
    terminationDate: row.terminationDate ? isoDate(row.terminationDate) : null,
    workLocation: row.workLocation,
    costCenter: row.costCenter,
    dateOfBirth: row.dateOfBirth ? isoDate(row.dateOfBirth) : null,
    baseSalary:
      row.baseSalaryAmount === null || row.baseSalaryCurrency === null
        ? null
        : { amount: row.baseSalaryAmount.toNumber(), currency: row.baseSalaryCurrency },
    bankName: row.bankName,
    bankAccountLast4: row.bankAccountLast4,
  };
}

/** Prisma column values for canonical fields (only the fields given). */
export function columnsOf(values: CanonicalEmployeePartial): Prisma.EmployeeUncheckedUpdateInput {
  const { baseSalary, hireDate, terminationDate, dateOfBirth, ...plain } = values;
  const columns: Prisma.EmployeeUncheckedUpdateInput = { ...plain };
  if (hireDate !== undefined) columns.hireDate = new Date(`${hireDate}T00:00:00.000Z`);
  if (terminationDate !== undefined) columns.terminationDate = toDate(terminationDate);
  if (dateOfBirth !== undefined) columns.dateOfBirth = toDate(dateOfBirth);
  if (baseSalary !== undefined) {
    columns.baseSalaryAmount = baseSalary === null ? null : new Prisma.Decimal(baseSalary.amount);
    columns.baseSalaryCurrency = baseSalary?.currency ?? null;
  }
  return columns;
}

/**
 * Column values for a new master row. The caller checks REQUIRED_EMPLOYEE_FIELDS
 * first, which is what makes the cast safe.
 */
export function createColumnsOf(
  values: CanonicalEmployeePartial & Pick<CanonicalEmployee, 'employeeNo'>,
): Prisma.EmployeeUncheckedCreateInput {
  return columnsOf(values) as Prisma.EmployeeUncheckedCreateInput;
}
