import { z } from 'zod';

/** Data-classification levels, least to most sensitive. */
export const CLASSIFICATION_LEVELS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;

export const classificationLevelSchema = z.enum(CLASSIFICATION_LEVELS);

export type ClassificationLevel = z.infer<typeof classificationLevelSchema>;

/** Position of a level in the order PUBLIC (0) to RESTRICTED (3). */
export function classificationRank(level: ClassificationLevel): number {
  return CLASSIFICATION_LEVELS.indexOf(level);
}

/** True when data at `level` may be shown to someone cleared up to `clearance`. */
export function isWithinClearance(
  level: ClassificationLevel,
  clearance: ClassificationLevel,
): boolean {
  return classificationRank(level) <= classificationRank(clearance);
}

/**
 * Classification of every canonical employee field (facts sheet section 6).
 * The master keeps only the bank name and the last four account digits.
 */
export const EMPLOYEE_FIELD_CLASSIFICATION = {
  employeeNo: 'INTERNAL',
  entityCode: 'INTERNAL',
  familyName: 'INTERNAL',
  givenName: 'INTERNAL',
  fullNameLatin: 'INTERNAL',
  fullNameLocal: 'INTERNAL',
  preferredName: 'INTERNAL',
  workEmail: 'INTERNAL',
  workPhone: 'CONFIDENTIAL',
  departmentCode: 'INTERNAL',
  jobTitle: 'INTERNAL',
  jobTitleZh: 'INTERNAL',
  jobGrade: 'CONFIDENTIAL',
  managerEmployeeNo: 'INTERNAL',
  employmentType: 'INTERNAL',
  employmentStatus: 'INTERNAL',
  hireDate: 'INTERNAL',
  terminationDate: 'INTERNAL',
  workLocation: 'INTERNAL',
  costCenter: 'CONFIDENTIAL',
  dateOfBirth: 'CONFIDENTIAL',
  baseSalary: 'RESTRICTED',
  bankName: 'RESTRICTED',
  bankAccountLast4: 'RESTRICTED',
} as const satisfies Record<string, ClassificationLevel>;

export type EmployeeField = keyof typeof EMPLOYEE_FIELD_CLASSIFICATION;

export const EMPLOYEE_FIELDS = Object.keys(EMPLOYEE_FIELD_CLASSIFICATION) as EmployeeField[];
