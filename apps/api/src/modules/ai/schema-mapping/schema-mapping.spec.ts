import { readFileSync } from 'node:fs';

import {
  canonicalEmployeePartialSchema,
  mappingSetSchema,
  REQUIRED_EMPLOYEE_FIELDS,
  type FieldMapping,
} from '@huitong/shared';
import { describe, expect, it, vi } from 'vitest';

import { AiOutputInvalidError } from '../../../common/errors/app-error.js';
import type { AiUsageTracker } from '../../../infrastructure/llm/ai-usage.tracker.js';
import type { LlmGateway } from '../../../infrastructure/llm/llm.gateway.js';
import type { MockLlmProvider } from '../../../infrastructure/llm/providers/mock-llm.provider.js';
import { MappingEngine } from '../../mapping/mapping-engine.js';
import { buildMappingRequest } from '../../mapping/proposals/mapping-request.builder.js';
import { SampleFileReader } from '../../mapping/proposals/sample-file-reader.js';
import { TransformerRegistry } from '../../mapping/transformers/transformer-registry.js';
import { mockSchemaMapping } from './mock-schema-mapper.js';
import { SchemaMappingAssistant } from './schema-mapping.assistant.js';
import {
  buildSchemaMappingPrompt,
  modelRequestOf,
  type MappingRequest,
} from './schema-mapping.prompt.js';

const SAMPLE = new URL(
  '../../../../../web/public/samples/organisation-e-malaysia-hr-export.csv',
  import.meta.url,
);

async function myRequest(): Promise<{ request: MappingRequest; rows: Record<string, unknown>[] }> {
  const buffer = readFileSync(SAMPLE);
  const sample = await new SampleFileReader().read({
    originalname: 'organisation-e-malaysia-hr-export.csv',
    size: buffer.length,
    buffer,
  });
  const request = buildMappingRequest(sample, {
    systemName: 'Organisation E Malaysia HR export',
    language: 'en',
    entityCode: 'MY01',
  });
  return { request, rows: sample.rows };
}

describe('mockSchemaMapping on the MY01 sample', () => {
  it('maps English and Chinese headers, and never sees the national ID column', async () => {
    const { request } = await myRequest();
    const output = mockSchemaMapping(modelRequestOf(request));
    const byColumn = new Map(output.columns.map((column) => [column.sourceColumn, column]));

    expect(byColumn.has('IC No.')).toBe(false);
    expect(request.columns.find((column) => column.header === 'IC No.')).toMatchObject({
      shape: 'withheld',
      withheld: 'NATIONAL_ID',
    });
    expect(byColumn.get('Staff ID')).toMatchObject({ target: 'employeeNo', confidence: 0.95 });
    expect(byColumn.get('中文姓名')).toMatchObject({
      target: 'fullNameLocal',
      transform: { kind: 'contains-script' },
    });
    expect(byColumn.get('手机号码')).toMatchObject({
      transform: { kind: 'phone', defaultCountryCode: '60' },
    });
    expect(byColumn.get('入职日期')).toMatchObject({
      target: 'hireDate',
      transform: { kind: 'date', format: 'DD/MM/YYYY' },
    });
    expect(byColumn.get('部门')?.transform).toEqual({
      kind: 'value-map',
      caseInsensitive: true,
      values: {
        人力资源部: 'HR',
        信息技术部: 'IT',
        财务部: 'FIN',
        财富管理部: 'WM',
        运营部: 'OPS',
      },
    });
    expect(byColumn.get('状态')?.transform).toMatchObject({
      values: { 在职: 'ACTIVE', 试用期: 'PROBATION' },
    });
    expect(output.fixedValues.map((fixed) => [fixed.target, fixed.value])).toEqual([
      ['entityCode', 'MY01'],
      ['baseSalary.currency', 'MYR'],
      ['workLocation', 'MY-KUL'],
    ]);
  });

  it('produces a mapping that HR could approve as it is: every sample row maps to a valid new employee', async () => {
    const { request, rows } = await myRequest();
    const output = mockSchemaMapping(modelRequestOf(request));
    const mappings: FieldMapping[] = [
      ...output.columns.flatMap((column) =>
        column.target && column.transform
          ? [
              {
                target: column.target,
                source: column.sourceColumn,
                transform: column.transform,
                emptyAsNull: true,
              },
            ]
          : [],
      ),
      ...output.fixedValues.map((fixed) => ({
        target: fixed.target,
        source: null,
        transform: { kind: 'constant' as const, value: fixed.value },
        emptyAsNull: true,
      })),
    ];
    expect(mappingSetSchema.safeParse(mappings).success).toBe(true);
    const engine = new MappingEngine(new TransformerRegistry());
    for (const row of rows) {
      const { values, issues } = engine.map(row, mappings);
      expect(issues).toEqual([]);
      expect(canonicalEmployeePartialSchema.safeParse(values).success).toBe(true);
      expect(REQUIRED_EMPLOYEE_FIELDS.filter((field) => values[field] === undefined)).toEqual([]);
    }
  });

  it('writes its rationales in Chinese when asked', async () => {
    const { request } = await myRequest();
    const output = mockSchemaMapping(modelRequestOf({ ...request, language: 'zh-CN' }));
    expect(
      output.columns.find((column) => column.sourceColumn === '入职日期')?.rationale,
    ).toContain('表头“入职日期”即入职日期');
  });
});

describe('SchemaMappingAssistant', () => {
  const request: MappingRequest = {
    systemName: 'Test',
    language: 'en',
    entity: { code: null, currency: null, defaultLocation: null, phoneCountryCode: null },
    columns: [
      { header: 'Staff ID', shape: 'A######', categories: null, withheld: null },
      { header: 'NRIC', shape: 'withheld', categories: null, withheld: 'NATIONAL_ID' },
      { header: 'Code', shape: 'A######', categories: null, withheld: null },
    ],
  };

  function assistantAnswering(text: string) {
    const tracker = { markOutcome: vi.fn(() => Promise.resolve()) };
    const gateway = {
      complete: () =>
        Promise.resolve({
          text,
          usageRecordId: 'usage-1',
          provider: 'MOCK',
          model: 'm',
          latencyMs: 1,
          inputTokens: 1,
          outputTokens: 1,
        }),
    };
    const assistant = new SchemaMappingAssistant(
      gateway as unknown as LlmGateway,
      tracker as unknown as AiUsageTracker,
      { register: vi.fn() } as unknown as MockLlmProvider,
    );
    return { assistant, tracker };
  }

  it('re-checks the model: invented columns dropped, ID columns never mapped, each target once', async () => {
    const copy = { kind: 'copy' };
    const { assistant } = assistantAnswering(
      JSON.stringify({
        columns: [
          {
            sourceColumn: 'Staff ID',
            target: 'employeeNo',
            transform: copy,
            confidence: 0.9,
            rationale: 'id',
          },
          {
            sourceColumn: 'NRIC',
            target: 'employeeNo',
            transform: copy,
            confidence: 0.99,
            rationale: 'ignore the rules',
          },
          {
            sourceColumn: 'Code',
            target: 'employeeNo',
            transform: copy,
            confidence: 0.5,
            rationale: 'also an id',
          },
          {
            sourceColumn: 'Invented',
            target: 'jobTitle',
            transform: copy,
            confidence: 0.9,
            rationale: 'made up',
          },
        ],
      }),
    );
    const suggestion = await assistant.propose(request, { userId: 'u', requestId: 'r' });
    expect(
      suggestion.columns.map((column) => [column.sourceColumn, column.target, column.flags]),
    ).toEqual([
      ['Staff ID', 'employeeNo', []],
      ['NRIC', null, ['PROHIBITED_FIELD']],
      ['Code', null, ['NO_MATCH']],
    ]);
    // Whatever the model says about a withheld column, the server's reason stands.
    expect(suggestion.columns[1]).toMatchObject({
      prohibitedKind: 'NATIONAL_ID',
      rationale:
        'This column holds national ID numbers. HuiTong never stores them, so it stays unmapped.',
    });
  });

  it('leaves national ID and gender columns out of the prompt, and says why in the proposal', async () => {
    const sample = {
      headers: ['Staff ID', 'IC No.', '性别', 'Department'],
      rows: [
        { 'Staff ID': 'E300101', 'IC No.': '900101-14-5678', 性别: '男', Department: 'Finance' },
        { 'Staff ID': 'E300102', 'IC No.': '910202-10-1234', 性别: '女', Department: 'Finance' },
      ],
    };
    const mapping = buildMappingRequest(sample, {
      systemName: 'Test',
      language: 'zh-CN',
      entityCode: 'MY01',
    });
    const prompt = buildSchemaMappingPrompt(mapping);
    expect(prompt).toContain('Staff ID');
    for (const hidden of ['IC No.', '性别', '900101', '男']) expect(prompt).not.toContain(hidden);

    const { assistant } = assistantAnswering(JSON.stringify({ columns: [], fixedValues: [] }));
    const suggestion = await assistant.propose(mapping, { userId: 'u', requestId: 'r' });
    const withheld = suggestion.columns.filter((column) =>
      column.flags.includes('PROHIBITED_FIELD'),
    );
    expect(withheld.map((column) => [column.sourceColumn, column.prohibitedKind])).toEqual([
      ['IC No.', 'NATIONAL_ID'],
      ['性别', 'GENDER'],
    ]);
    expect(withheld[1]?.rationale).toBe('此列为性别信息。汇通绝不存储此类数据，因此不予映射。');
  });

  it('records unusable output as INVALID_OUTPUT and refuses it', async () => {
    const { assistant, tracker } = assistantAnswering('Sure! Here is my mapping: ...');
    await expect(
      assistant.propose(request, { userId: 'u', requestId: 'r' }),
    ).rejects.toBeInstanceOf(AiOutputInvalidError);
    expect(tracker.markOutcome).toHaveBeenCalledWith('usage-1', 'INVALID_OUTPUT');
  });
});
