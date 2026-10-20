import {
  DEPARTMENTS,
  isWithinClearance,
  type ClassificationLevel,
  type EmployeeField,
  type EntityCode,
  type Locale,
} from '@huitong/shared';

import type { DiscrepancyRequest } from '../ai/discrepancy/discrepancy.prompt.js';
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

export interface ExplainerInput {
  language: Locale;
  employee: { employeeNo: string; entityCode: EntityCode };
  field: EmployeeField;
  classification: ClassificationLevel;
  candidates: readonly { connectorId: string; value: unknown }[];
  /** Each source's name in the UI language. */
  systems: ReadonlyMap<string, string>;
  /** When each source last changed the record, where it says. */
  changedAt: ReadonlyMap<string, string | null>;
}

/**
 * What the discrepancy explainer may tell the model about a conflict
 * (ADR 0011): the employee number and entity, never a name, and no value
 * above INTERNAL, which is sent as null.
 */
export function explainerRequest(input: ExplainerInput): DiscrepancyRequest {
  const shareable = isWithinClearance(input.classification, 'INTERNAL');
  return {
    language: input.language,
    // Picked field by field, so that a whole record passed in never adds its names.
    employee: { employeeNo: input.employee.employeeNo, entityCode: input.employee.entityCode },
    field: { label: label(input.field, input.language), classification: input.classification },
    candidates: input.candidates.map((candidate) => ({
      system: input.systems.get(candidate.connectorId) ?? candidate.connectorId,
      value: shareable ? spoken(input.field, candidate.value, input.language) : null,
      changedAt: input.changedAt.get(candidate.connectorId) ?? null,
    })),
  };
}
