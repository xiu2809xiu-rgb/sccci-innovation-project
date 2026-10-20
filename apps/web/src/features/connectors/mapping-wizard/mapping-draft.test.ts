import type { FieldMapping, MappingProposal } from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import {
  draftFromProposal,
  draftProblems,
  mappingsFromDraft,
  retargetedColumns,
  type MappingDraft,
} from './mapping-draft';

function proposal(): MappingProposal {
  return {
    id: '0199f0a0-0000-7000-8000-0000000000a1',
    sourceSystemName: 'Malaysia payroll export',
    entityCode: 'MY01',
    connectorId: null,
    fileName: 'my-payroll-sample.csv',
    headers: ['员工编号', '姓名', '入职日期', '身份证号码', '备注'],
    sampleRowCount: 12,
    columns: [
      {
        sourceColumn: '员工编号',
        sampleShape: 'E######',
        target: 'employeeNo',
        transform: { kind: 'copy' },
        confidence: 0.98,
        rationale: 'The header means employee number.',
        flags: [],
      },
      {
        sourceColumn: '姓名',
        sampleShape: 'Han characters',
        target: 'fullNameLocal',
        transform: { kind: 'contains-script', script: 'Han' },
        confidence: 0.9,
        rationale: 'A Chinese name.',
        flags: [],
      },
      {
        sourceColumn: '入职日期',
        sampleShape: 'YYYY/MM/DD',
        target: 'hireDate',
        transform: { kind: 'date', format: 'YYYY/MM/DD' },
        confidence: 0.95,
        rationale: 'The header means hire date.',
        flags: [],
      },
      {
        // A national ID column the model wrongly matched: it must never be mapped.
        sourceColumn: '身份证号码',
        sampleShape: '18 digits',
        target: 'workPhone',
        transform: { kind: 'copy' },
        confidence: 0.4,
        rationale: 'Withheld: a national ID number.',
        flags: ['PROHIBITED_FIELD', 'LOW_CONFIDENCE'],
      },
      {
        sourceColumn: '备注',
        sampleShape: 'free text',
        target: null,
        transform: null,
        confidence: 0,
        rationale: 'No canonical field fits.',
        flags: ['NO_MATCH'],
      },
    ],
    fixedValues: [{ target: 'entityCode', value: 'MY01', rationale: 'Every row is MY01.' }],
    status: 'PENDING_REVIEW',
    language: 'en',
    provider: 'MOCK',
    model: 'mock-mapping-v1',
    createdBy: { id: '0199f0a0-0000-7000-8000-000000000001', displayName: 'Tan Mei Ling' },
    createdAt: '2026-10-20T08:00:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    mappingConfig: null,
  };
}

const targets = (mappings: readonly FieldMapping[]) => mappings.map((mapping) => mapping.target);

describe('draftFromProposal', () => {
  it('accepts every suggestion except a prohibited one, and keeps the constants', () => {
    expect(draftFromProposal(proposal())).toEqual({
      columns: {
        员工编号: 'employeeNo',
        姓名: 'fullNameLocal',
        入职日期: 'hireDate',
        身份证号码: null,
        备注: null,
      },
      constants: { entityCode: true },
    });
  });
});

describe('mappingsFromDraft', () => {
  it('keeps the AI transforms in column order, then the constants', () => {
    const source = proposal();
    const mappings = mappingsFromDraft(source, draftFromProposal(source));
    expect(targets(mappings)).toEqual(['employeeNo', 'fullNameLocal', 'hireDate', 'entityCode']);
    expect(mappings[2]).toEqual({
      target: 'hireDate',
      source: '入职日期',
      transform: { kind: 'date', format: 'YYYY/MM/DD' },
      emptyAsNull: true,
    });
    expect(mappings[3]).toEqual({
      target: 'entityCode',
      source: null,
      transform: { kind: 'constant', value: 'MY01' },
      emptyAsNull: true,
    });
  });

  it('never maps a prohibited column, whatever the draft says', () => {
    const source = proposal();
    const draft = draftFromProposal(source);
    const mappings = mappingsFromDraft(source, {
      ...draft,
      columns: { ...draft.columns, 身份证号码: 'costCenter' },
    });
    expect(mappings.map((mapping) => mapping.source)).not.toContain('身份证号码');
  });

  it('copies a column HR points somewhere else, and flags it for a second look', () => {
    const source = proposal();
    const draft = draftFromProposal(source);
    const edited: MappingDraft = { ...draft, columns: { ...draft.columns, 入职日期: 'jobTitle' } };
    const mappings = mappingsFromDraft(source, edited);
    expect(mappings.find((mapping) => mapping.source === '入职日期')).toMatchObject({
      target: 'jobTitle',
      transform: { kind: 'copy' },
    });
    expect(retargetedColumns(source, edited)).toEqual(new Set(['入职日期']));
    expect(retargetedColumns(source, draft).size).toBe(0);
  });

  it('leaves out columns and constants HR turned off', () => {
    const source = proposal();
    const draft = draftFromProposal(source);
    const mappings = mappingsFromDraft(source, {
      columns: { ...draft.columns, 姓名: null },
      constants: { entityCode: false },
    });
    expect(targets(mappings)).toEqual(['employeeNo', 'hireDate']);
  });
});

describe('draftProblems', () => {
  const copy = (target: FieldMapping['target'], source: string): FieldMapping => ({
    target,
    source,
    transform: { kind: 'copy' },
    emptyAsNull: true,
  });

  it('finds nothing wrong with the accepted proposal', () => {
    const source = proposal();
    expect(draftProblems(mappingsFromDraft(source, draftFromProposal(source)))).toEqual([]);
  });

  it('names a target mapped twice and a missing employee number', () => {
    expect(draftProblems([copy('jobTitle', 'Title'), copy('jobTitle', 'Role')])).toEqual([
      { kind: 'duplicate', target: 'jobTitle' },
      { kind: 'missingEmployeeNo' },
    ]);
  });

  it('asks for both salary parts together', () => {
    expect(
      draftProblems([copy('employeeNo', 'Emp No'), copy('baseSalary.amount', 'Basic')]),
    ).toEqual([{ kind: 'salaryIncomplete' }]);
  });

  it('reports anything else the shared contract rejects as invalid', () => {
    const sourceless: FieldMapping = { ...copy('employeeNo', 'Emp No'), source: null };
    expect(draftProblems([sourceless])).toEqual([{ kind: 'invalid' }]);
  });
});
