import { z } from 'zod';

import type { EmployeeField } from '../governance/classification.js';

/** Date layouts the `date` transform reads; output is always ISO `YYYY-MM-DD`. */
export const DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYYMMDD',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'DD.MM.YYYY',
] as const;

export const dateFormatSchema = z.enum(DATE_FORMATS);

export type DateFormat = z.infer<typeof dateFormatSchema>;

/**
 * How one source value becomes a canonical value. Each `kind` is one Strategy
 * class in the API's mapping engine; mappings are configuration, so a new
 * subsidiary needs a mapping, not new code.
 */
export const transformSpecSchema = z.discriminatedUnion('kind', [
  /** The value as it is (strings are trimmed). */
  z.object({ kind: z.literal('copy') }),
  /** A date in `format`, written as ISO. */
  z.object({ kind: z.literal('date'), format: dateFormatSchema }),
  /** A lookup table: department codes, enum codes, locations. Unknown values are errors. */
  z.object({
    kind: z.literal('value-map'),
    values: z.record(z.string().max(100), z.string().max(100)),
    caseInsensitive: z.boolean().default(false),
  }),
  /** One part of a `FAMILY Given` name (family in capitals first, as SAP exports it). */
  z.object({
    kind: z.literal('name-part'),
    format: z.literal('FAMILY_GIVEN'),
    part: z.enum(['family', 'given']),
  }),
  /** A whole `FAMILY Given` name, rewritten in the stated order with normal capitals. */
  z.object({
    kind: z.literal('name-full'),
    format: z.literal('FAMILY_GIVEN'),
    order: z.enum(['FAMILY_FIRST', 'GIVEN_FIRST']),
  }),
  /** A phone number in E.164; numbers without a `+` get the default country code. */
  z.object({ kind: z.literal('phone'), defaultCountryCode: z.string().regex(/^[1-9]\d{0,2}$/) }),
  /** A number written as text, such as `"12500.00"`. */
  z.object({ kind: z.literal('number') }),
  /** The last four digits only (data minimisation for bank accounts). */
  z.object({ kind: z.literal('last-four-digits') }),
  /** Lower case, for email addresses. */
  z.object({ kind: z.literal('lowercase') }),
  /**
   * Keeps the value only when it contains characters of `script`, otherwise
   * empty: SAP's 姓名 holds a Chinese name when there is one. A fixed list of
   * scripts rather than a pattern, so a mapping cannot carry a runaway regex.
   */
  z.object({ kind: z.literal('contains-script'), script: z.enum(['Han']) }),
  /** A fixed value, for facts a system implies but does not export (its legal entity). */
  z.object({ kind: z.literal('constant'), value: z.string().max(100) }),
  /**
   * The first rule whose columns all equal the given values wins; `{}` matches
   * anything. For codes spread over several columns, such as SAP's status flags.
   */
  z.object({
    kind: z.literal('rules'),
    rules: z
      .array(
        z.object({
          when: z.record(z.string().max(200), z.string().max(100)),
          value: z.string().max(100),
        }),
      )
      .min(1)
      .max(20),
  }),
]);

export type TransformSpec = z.infer<typeof transformSpecSchema>;

export type TransformKind = TransformSpec['kind'];

/**
 * Canonical fields a mapping can write: every employee field, with money mapped
 * as its two parts. A test keeps this list in step with the classification map.
 */
export const MAPPING_TARGETS = [
  'employeeNo',
  'entityCode',
  'familyName',
  'givenName',
  'fullNameLatin',
  'fullNameLocal',
  'preferredName',
  'workEmail',
  'workPhone',
  'departmentCode',
  'jobTitle',
  'jobTitleZh',
  'jobGrade',
  'managerEmployeeNo',
  'employmentType',
  'employmentStatus',
  'hireDate',
  'terminationDate',
  'workLocation',
  'costCenter',
  'dateOfBirth',
  'baseSalary.amount',
  'baseSalary.currency',
  'bankName',
  'bankAccountLast4',
] as const;

export const mappingTargetSchema = z.enum(MAPPING_TARGETS);

export type MappingTarget = z.infer<typeof mappingTargetSchema>;

/** The canonical field a target writes to (`baseSalary.amount` belongs to `baseSalary`). */
export function targetField(target: MappingTarget): EmployeeField {
  return target.startsWith('baseSalary.') ? 'baseSalary' : (target as EmployeeField);
}

/** One canonical field and where its value comes from. */
export const fieldMappingSchema = z.object({
  target: mappingTargetSchema,
  /** The source column or key; null for transforms that read no single column (constant, rules). */
  source: z.string().min(1).max(200).nullable(),
  transform: transformSpecSchema,
  /** Treat empty strings as "no value" before transforming (SAP sends `""` for nothing). */
  emptyAsNull: z.boolean().default(true),
});

export type FieldMapping = z.infer<typeof fieldMappingSchema>;

const SOURCELESS_KINDS: readonly TransformKind[] = ['constant', 'rules'];

/**
 * A complete mapping for one system. Rules: each target at most once, the
 * employee number always mapped, and a source column wherever the transform
 * reads one.
 */
export const mappingSetSchema = z
  .array(fieldMappingSchema)
  .min(1)
  .max(100)
  .superRefine((mappings, ctx) => {
    const seen = new Set<string>();
    mappings.forEach((mapping, index) => {
      if (seen.has(mapping.target)) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'target'],
          message: `${mapping.target} is mapped more than once`,
        });
      }
      seen.add(mapping.target);
      const needsSource = !SOURCELESS_KINDS.includes(mapping.transform.kind);
      if (needsSource && mapping.source === null) {
        ctx.addIssue({
          code: 'custom',
          path: [index, 'source'],
          message: `a ${mapping.transform.kind} transform needs a source column`,
        });
      }
    });
    if (!seen.has('employeeNo')) {
      ctx.addIssue({ code: 'custom', path: [], message: 'employeeNo must be mapped' });
    }
    const salaryParts = ['baseSalary.amount', 'baseSalary.currency'].filter((part) =>
      seen.has(part),
    );
    if (salaryParts.length === 1) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'baseSalary needs both its amount and its currency',
      });
    }
  });

export type MappingSet = z.infer<typeof mappingSetSchema>;
