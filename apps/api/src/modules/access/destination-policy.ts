import { fieldsCoveredBy, type EmployeeField, type EntityCode } from '@huitong/shared';

/** An ACTIVE entry of the cross-border transfer register, as the access policy reads it. */
export interface ActiveTransfer {
  id: string;
  fromEntityCode: string;
  toEntityCode: string;
  dataCategories: readonly string[];
  version: number;
}

/** Which register entry, at which version, allowed a field: recorded with every withholding. */
export interface TransferVersion {
  id: string;
  version: number;
}

/**
 * What one entity's employee records may show to users of another (story
 * B-7). `home`: the viewer's own entity, where no allowlist applies.
 * `shared`: only the fields the ACTIVE transfers from the source to the
 * viewer's entity cover; everything else is withheld (default deny).
 */
export type Disclosure =
  | { kind: 'home' }
  | { kind: 'shared'; fields: ReadonlySet<EmployeeField>; transfers: readonly TransferVersion[] };

/**
 * Every field the employee list shows, searches, filters or sorts by. A
 * record of another entity is listed only when all of them are shared, so a
 * search, a filter or the sort order can never reveal a withheld value.
 */
export const DIRECTORY_FIELDS: readonly EmployeeField[] = [
  'employeeNo',
  'entityCode',
  'fullNameLatin',
  'fullNameLocal',
  'preferredName',
  'workEmail',
  'departmentCode',
  'jobTitle',
  'jobTitleZh',
  'employmentStatus',
  'workLocation',
  'hireDate',
];

export function disclosureOf(
  transfers: readonly ActiveTransfer[],
  source: EntityCode,
  destination: EntityCode,
): Disclosure {
  if (source === destination) return { kind: 'home' };
  const applying = transfers.filter(
    (transfer) => transfer.fromEntityCode === source && transfer.toEntityCode === destination,
  );
  const fields = new Set<EmployeeField>();
  for (const transfer of applying) {
    for (const field of fieldsCoveredBy(transfer.dataCategories)) fields.add(field);
  }
  return {
    kind: 'shared',
    fields,
    transfers: applying.map(({ id, version }) => ({ id, version })),
  };
}

export function isShared(disclosure: Disclosure, field: string): boolean {
  return disclosure.kind === 'home' || (disclosure.fields as ReadonlySet<string>).has(field);
}

/** Whether the records may appear in the employee list at all (see DIRECTORY_FIELDS). */
export function isListable(disclosure: Disclosure): boolean {
  return DIRECTORY_FIELDS.every((field) => isShared(disclosure, field));
}
