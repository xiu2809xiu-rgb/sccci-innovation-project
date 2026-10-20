import { describe, expect, it } from 'vitest';

import { buildDiscrepancyPrompt } from '../ai/discrepancy/discrepancy.prompt.js';
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
    employee: { employeeNo: 'E100066', entityCode: 'SG01' },
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
  it('names the employee by number only, even when handed a whole record', () => {
    const record = {
      employeeNo: 'E100066',
      entityCode: 'SG01',
      fullNameLatin: 'Lee Jia Cheng',
      fullNameLocal: '李嘉诚',
    } as const;
    const prompt = buildDiscrepancyPrompt(
      explainerRequest(input({ language: 'zh-CN', employee: record })),
    );
    expect(prompt).toContain('E100066');
    expect(prompt).not.toContain('Lee Jia Cheng');
    expect(prompt).not.toContain('李嘉诚');
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
      expect(request.candidates.map((candidate) => candidate.value)).toEqual([null, null]);
      const prompt = buildDiscrepancyPrompt(request);
      expect(prompt).not.toContain('9800');
      expect(prompt).not.toContain('9500');
    },
  );

  it('sends an Internal value as words in the UI language, with each system named', () => {
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
    expect(request.candidates).toEqual([
      { system: 'Singapore HR', value: '财富管理部', changedAt: '2026-10-12T02:00:00.000Z' },
      { system: 'China HQ SAP HCM', value: '运营部', changedAt: null },
    ]);
  });
});
