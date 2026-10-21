import { EMPLOYEE_FIELDS, type EmployeeField } from './classification.js';

/**
 * The data categories a cross-border transfer register entry may list, and
 * the canonical fields each one covers. An entry may also name a single
 * field, such as `jobGrade`.
 */
export const TRANSFER_CATEGORIES = {
  identity: [
    'employeeNo',
    'entityCode',
    'familyName',
    'givenName',
    'fullNameLatin',
    'fullNameLocal',
    'preferredName',
  ],
  'job-and-organisation': [
    'departmentCode',
    'jobTitle',
    'jobTitleZh',
    'managerEmployeeNo',
    'employmentType',
    'employmentStatus',
    'hireDate',
    'terminationDate',
    'workLocation',
  ],
  'work-contact': ['workEmail', 'workPhone'],
} as const satisfies Record<string, readonly EmployeeField[]>;

const isCategory = (entry: string): entry is keyof typeof TRANSFER_CATEGORIES =>
  Object.hasOwn(TRANSFER_CATEGORIES, entry);

const isField = (entry: string): entry is EmployeeField =>
  (EMPLOYEE_FIELDS as readonly string[]).includes(entry);

/**
 * The canonical fields a register entry's data categories cover. An entry
 * that is neither a category nor a field covers nothing, so a typo withholds
 * data rather than sharing it (default deny).
 */
export function fieldsCoveredBy(dataCategories: readonly string[]): Set<EmployeeField> {
  const fields = new Set<EmployeeField>();
  for (const entry of dataCategories) {
    if (isCategory(entry)) {
      for (const field of TRANSFER_CATEGORIES[entry]) fields.add(field);
    } else if (isField(entry)) {
      fields.add(entry);
    }
  }
  return fields;
}
