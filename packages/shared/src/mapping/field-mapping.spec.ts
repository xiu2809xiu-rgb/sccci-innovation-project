import { describe, expect, it } from 'vitest';

import { canonicalEmployeeSchema } from '../employees/canonical-employee.js';
import { EMPLOYEE_FIELDS } from '../governance/classification.js';
import {
  MAPPING_TARGETS,
  mappingSetSchema,
  targetField,
  type FieldMapping,
} from './field-mapping.js';
import { aiMappingOutputSchema } from './mapping-proposal.js';

const copy = (target: FieldMapping['target'], source: string): FieldMapping => ({
  target,
  source,
  transform: { kind: 'copy' },
  emptyAsNull: true,
});

describe('canonical fields', () => {
  it('keeps the canonical schema, the classification map and the mapping targets in step', () => {
    expect(Object.keys(canonicalEmployeeSchema.shape).sort()).toEqual([...EMPLOYEE_FIELDS].sort());
    const covered = [...new Set(MAPPING_TARGETS.map(targetField))].sort();
    expect(covered).toEqual([...EMPLOYEE_FIELDS].sort());
  });
});

describe('mappingSetSchema', () => {
  it('accepts a mapping with the employee number and both salary parts', () => {
    const result = mappingSetSchema.safeParse([
      copy('employeeNo', 'Staff ID'),
      copy('baseSalary.amount', 'Salary'),
      copy('baseSalary.currency', 'Currency'),
      { target: 'entityCode', source: null, transform: { kind: 'constant', value: 'MY01' } },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects a target mapped twice, a missing employee number and half a salary', () => {
    const duplicate = mappingSetSchema.safeParse([
      copy('employeeNo', 'Staff ID'),
      copy('jobTitle', 'Title'),
      copy('jobTitle', 'Position'),
    ]);
    expect(duplicate.error?.issues.map((issue) => issue.message)).toContain(
      'jobTitle is mapped more than once',
    );

    const noKey = mappingSetSchema.safeParse([copy('jobTitle', 'Title')]);
    expect(noKey.error?.issues.map((issue) => issue.message)).toContain(
      'employeeNo must be mapped',
    );

    const halfSalary = mappingSetSchema.safeParse([
      copy('employeeNo', 'Staff ID'),
      copy('baseSalary.amount', 'Salary'),
    ]);
    expect(halfSalary.error?.issues.map((issue) => issue.message)).toContain(
      'baseSalary needs both its amount and its currency',
    );
  });

  it('requires a source column unless the transform reads none', () => {
    const result = mappingSetSchema.safeParse([
      { target: 'employeeNo', source: null, transform: { kind: 'copy' } },
    ]);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'a copy transform needs a source column',
    );
  });
});

describe('aiMappingOutputSchema', () => {
  it('refuses targets outside the canonical model and transforms it does not know', () => {
    const output = (target: string, kind: string) =>
      aiMappingOutputSchema.safeParse({
        columns: [
          {
            sourceColumn: 'IC No.',
            target,
            transform: { kind },
            confidence: 0.9,
            rationale: 'Looks like an identity number',
          },
        ],
      });
    expect(output('nationalId', 'copy').success).toBe(false);
    expect(output('employeeNo', 'eval').success).toBe(false);
    expect(output('employeeNo', 'copy').success).toBe(true);
  });
});
