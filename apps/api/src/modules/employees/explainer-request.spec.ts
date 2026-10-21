import { describe, expect, it } from 'vitest';

import { buildDiscrepancyPrompt } from '../ai/discrepancy/discrepancy.prompt.js';
import { mockExplainDiscrepancy } from '../ai/discrepancy/mock-discrepancy-explainer.js';
import { explainerRequest, type ExplainerInput } from './explainer-request.js';

const SYSTEMS = new Map([
  ['sg-hr', 'Singapore HR'],
  ['cn-hq', 'China HQ SAP HCM'],
]);
const CHANGED_AT = new Map<string, string | null>([
  ['sg-hr', '2026-10-12T02:00:00.000Z'],
  ['cn-hq', null],
]);

function input(overrides: Partial<ExplainerInput> = {}): ExplainerInput {
  return {
    language: 'en',
    entityCode: 'SG01',
    field: 'workEmail',
    classification: 'INTERNAL',
    candidates: [
      { connectorId: 'sg-hr', value: 'jiachenglee@orge.example' },
      { connectorId: 'cn-hq', value: 'jiacheng.lee@orge.example' },
    ],
    systems: SYSTEMS,
    changedAt: CHANGED_AT,
    ...overrides,
  };
}

describe('explainerRequest', () => {
  it.each([
    ['workEmail', 'jiachenglee@orge.example', 'jiacheng.lee@orge.example'],
    ['fullNameLatin', 'Lee Jia Cheng', 'Lee Jiacheng'],
    ['fullNameLocal', '李嘉诚', '李家成'],
    ['managerEmployeeNo', 'E100006', 'E100009'],
  ] as const)('withholds a %s, because it identifies a person', (field, first, second) => {
    const request = explainerRequest(
      input({
        field,
        candidates: [
          { connectorId: 'sg-hr', value: first },
          { connectorId: 'cn-hq', value: second },
        ],
      }),
    );
    expect(request.field.withheld).toBe('IDENTIFIES_A_PERSON');
    expect(request.candidates.map((candidate) => candidate.value)).toEqual([null, null]);
    const prompt = buildDiscrepancyPrompt(request);
    expect(prompt).not.toContain(first);
    expect(prompt).not.toContain(second);
  });

  it('tells the model only the entity, never who the employee is', () => {
    const request = explainerRequest(input({ language: 'zh-CN' }));
    expect(Object.keys(request).sort()).toEqual(['candidates', 'entityCode', 'field', 'language']);
    expect(request.entityCode).toBe('SG01');
    expect(buildDiscrepancyPrompt(request)).not.toMatch(/E1\d{5}/);
  });

  it.each(['CONFIDENTIAL', 'RESTRICTED'] as const)(
    'sends no %s value to the model, only that the systems differ',
    (classification) => {
      const request = explainerRequest(
        input({
          field: 'baseSalary',
          classification,
          candidates: [
            { connectorId: 'sg-hr', value: { amount: 9800, currency: 'SGD' } },
            { connectorId: 'cn-hq', value: { amount: 9500, currency: 'SGD' } },
          ],
        }),
      );
      expect(request.field.withheld).toBe('ABOVE_INTERNAL');
      expect(request.candidates.map((candidate) => candidate.value)).toEqual([null, null]);
      const prompt = buildDiscrepancyPrompt(request);
      expect(prompt).not.toContain('9800');
      expect(prompt).not.toContain('9500');
    },
  );

  it('sends an Internal value that identifies nobody as words in the UI language, with each system named', () => {
    const request = explainerRequest(
      input({
        language: 'zh-CN',
        field: 'departmentCode',
        candidates: [
          { connectorId: 'sg-hr', value: 'WM' },
          { connectorId: 'cn-hq', value: 'OPS' },
        ],
      }),
    );
    expect(request.field.withheld).toBeNull();
    expect(request.candidates).toEqual([
      { system: 'Singapore HR', value: '财富管理部', changedAt: '2026-10-12T02:00:00.000Z' },
      { system: 'China HQ SAP HCM', value: '运营部', changedAt: null },
    ]);
  });
});

describe('mockExplainDiscrepancy', () => {
  it('says why identifying values are not shown, in both languages', () => {
    expect(mockExplainDiscrepancy(explainerRequest(input()))).toContain(
      'because they identify the person',
    );
    expect(mockExplainDiscrepancy(explainerRequest(input({ language: 'zh-CN' })))).toContain(
      '可识别员工身份',
    );
  });

  it('refers to "this employee", never to a number or a name', () => {
    const text = mockExplainDiscrepancy(
      explainerRequest(
        input({
          field: 'departmentCode',
          candidates: [
            { connectorId: 'sg-hr', value: 'WM' },
            { connectorId: 'cn-hq', value: 'OPS' },
          ],
        }),
      ),
    );
    expect(text).toContain("this employee's");
    expect(text).not.toMatch(/E1\d{5}/);
  });
});
