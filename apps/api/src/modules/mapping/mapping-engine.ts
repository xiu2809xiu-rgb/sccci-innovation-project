import { Injectable } from '@nestjs/common';
import {
  EMPLOYEE_FIELD_CLASSIFICATION,
  isWithinClearance,
  targetField,
  type EmployeeField,
  type FieldMapping,
  type MappingTarget,
  type TransformKind,
} from '@huitong/shared';

import type { TransformResult } from './transformers/field-transformer.js';
import { TransformerRegistry } from './transformers/transformer-registry.js';

/** One value that could not be mapped. `message` is safe to store and to show to HR. */
export interface MappingIssue {
  target: MappingTarget;
  source: string | null;
  message: string;
}

/** A source record in canonical terms: whatever the mapping produced, and what it could not. */
export interface MappingOutcome {
  values: Partial<Record<EmployeeField, unknown>>;
  issues: MappingIssue[];
}

const SOURCELESS: readonly TransformKind[] = ['constant', 'rules'];

type Step = TransformResult | { ok: true; skipped: true };

/**
 * Turns one source record into canonical values by running each field mapping
 * through its transformer (Strategy). Values that fail are reported, not
 * guessed. Error messages repeat a source value only when the target field is
 * INTERNAL or less, so a sync log never holds a salary or a birth date.
 */
@Injectable()
export class MappingEngine {
  constructor(private readonly transformers: TransformerRegistry) {}

  map(
    record: Readonly<Record<string, unknown>>,
    mappings: readonly FieldMapping[],
  ): MappingOutcome {
    const values: Partial<Record<EmployeeField, unknown>> = {};
    const salary: { amount?: unknown; currency?: unknown } = {};
    const issues: MappingIssue[] = [];

    for (const mapping of mappings) {
      const step = this.apply(mapping, record);
      if (!step.ok) {
        issues.push(this.issue(mapping, record, step.reason));
        continue;
      }
      if ('skipped' in step) continue;
      if (mapping.target === 'baseSalary.amount') salary.amount = step.value;
      else if (mapping.target === 'baseSalary.currency') salary.currency = step.value;
      else values[mapping.target] = step.value;
    }

    if ('amount' in salary || 'currency' in salary) {
      const amount = salary.amount ?? null;
      const currency = salary.currency ?? null;
      if (amount === null && currency === null) {
        values.baseSalary = null;
      } else if (amount === null || currency === null) {
        issues.push({
          target: amount === null ? 'baseSalary.amount' : 'baseSalary.currency',
          source: null,
          message: 'Salary needs both an amount and a currency',
        });
      } else {
        values.baseSalary = { amount, currency };
      }
    }
    return { values, issues };
  }

  private apply(mapping: FieldMapping, record: Readonly<Record<string, unknown>>): Step {
    const { transform, source } = mapping;
    if (SOURCELESS.includes(transform.kind) || source === null) {
      return this.transformers.get(transform.kind).apply(transform, { value: undefined, record });
    }
    if (!(source in record)) {
      return { ok: false, reason: 'the column is missing from the record' };
    }
    const raw = record[source];
    const empty =
      raw === null ||
      raw === undefined ||
      (mapping.emptyAsNull && typeof raw === 'string' && raw.trim() === '');
    if (empty) return { ok: true, value: null };
    return this.transformers.get(transform.kind).apply(transform, { value: raw, record });
  }

  private issue(
    mapping: FieldMapping,
    record: Readonly<Record<string, unknown>>,
    reason: string,
  ): MappingIssue {
    const column = mapping.source ?? mapping.transform.kind;
    const level = EMPLOYEE_FIELD_CLASSIFICATION[targetField(mapping.target)];
    const raw = mapping.source === null ? undefined : record[mapping.source];
    const shown =
      raw === undefined || raw === null
        ? ''
        : isWithinClearance(level, 'INTERNAL')
          ? ` "${MappingEngine.display(raw).slice(0, 60)}"`
          : ` (value withheld: ${level.toLowerCase()})`;
    return {
      target: mapping.target,
      source: mapping.source,
      message: `${column}${shown}: ${reason}`,
    };
  }

  private static display(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }
}
