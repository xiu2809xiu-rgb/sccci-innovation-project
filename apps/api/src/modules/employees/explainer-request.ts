import {
  DEPARTMENTS,
  IDENTIFYING_EMPLOYEE_FIELDS,
  isWithinClearance,
  type ClassificationLevel,
  type EmployeeField,
  type EntityCode,
  type Locale,
} from '@huitong/shared';

import type { DiscrepancyRequest, WithheldReason } from '../ai/discrepancy/discrepancy.prompt.js';
import { FIELD_WORDS } from '../ai/schema-mapping/field-vocabulary.js';

function label(field: EmployeeField, language: Locale): string {
  const target = field === 'baseSalary' ? 'baseSalary.amount' : field;
  return FIELD_WORDS.find((words) => words.target === target)?.label[language] ?? field;
}

/** A value as words for the explainer: department codes become their names. */
function spoken(field: EmployeeField, value: unknown, language: Locale): string {
  if (field === 'departmentCode') {
    const department = DEPARTMENTS.find((candidate) => candidate.code === value);
    if (department) return language === 'zh-CN' ? department.nameZh : department.nameEn;
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : JSON.stringify(value);
}

function withheldReason(
  field: EmployeeField,
  classification: ClassificationLevel,
  visibleToViewer: boolean,
): WithheldReason | null {
  if (!visibleToViewer) return 'NOT_SHARED';
  if (!isWithinClearance(classification, 'INTERNAL')) return 'ABOVE_INTERNAL';
  return (IDENTIFYING_EMPLOYEE_FIELDS as readonly string[]).includes(field)
    ? 'IDENTIFIES_A_PERSON'
    : null;
}

export interface ExplainerInput {
  language: Locale;
  /** The employee's entity: the only thing the model learns about who the conflict concerns. */
  entityCode: EntityCode;
  field: EmployeeField;
  classification: ClassificationLevel;
  /** Whether the person asking may see this field at all (role clearance and the transfer register). */
  visibleToViewer: boolean;
  candidates: readonly { connectorId: string; value: unknown }[];
  /** Each source's name in the UI language. */
  systems: ReadonlyMap<string, string>;
  /** When each source last changed the record, where it says. */
  changedAt: ReadonlyMap<string, string | null>;
}

/**
 * What the discrepancy explainer may tell the model about a conflict
 * (ADR 0011, story E-5): the entity, the field and each system's value, but
 * no employee identifier. A value above INTERNAL, or one that identifies a
 * person (a name, an email address, a manager's number), is sent as null.
 */
export function explainerRequest(input: ExplainerInput): DiscrepancyRequest {
  const withheld = withheldReason(input.field, input.classification, input.visibleToViewer);
  return {
    language: input.language,
    entityCode: input.entityCode,
    field: {
      label: label(input.field, input.language),
      classification: input.classification,
      withheld,
    },
    candidates: input.candidates.map((candidate) => ({
      system: input.systems.get(candidate.connectorId) ?? candidate.connectorId,
      value: withheld ? null : spoken(input.field, candidate.value, input.language),
      changedAt: input.changedAt.get(candidate.connectorId) ?? null,
    })),
  };
}
