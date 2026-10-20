import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_CLEARANCE_RULES, EMPLOYEE_FIELD_CLASSIFICATION, type Role } from '@huitong/shared';
import { firstValueFrom, of } from 'rxjs';

import type { AccessPolicyService } from '../../modules/access/access-policy.service.js';
import type { MaskFieldsSpec } from '../decorators/route-metadata.js';
import { FieldMaskingInterceptor } from './field-masking.interceptor.js';

const spec: MaskFieldsSpec = {
  classifications: EMPLOYEE_FIELD_CLASSIFICATION,
  entityField: 'entityCode',
};
const record = {
  employeeNo: 'E100023',
  entityCode: 'SG01',
  workPhone: '+6591234567',
  baseSalary: { amount: 5800, currency: 'SGD' },
};

async function intercept(body: unknown, role: Role | null, withSpec = true): Promise<unknown> {
  const reflector = {
    getAllAndOverride: vi.fn(() => (withSpec ? spec : undefined)),
  } as unknown as Reflector;
  const access = {
    clearanceRules: () => DEFAULT_CLEARANCE_RULES,
  } as unknown as AccessPolicyService;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'u', role, homeEntityCode: 'SG01' } : undefined }),
    }),
  } as unknown as ExecutionContext;
  const next: CallHandler = { handle: () => of(body) };
  return firstValueFrom(new FieldMaskingInterceptor(reflector, access).intercept(context, next));
}

describe('FieldMaskingInterceptor', () => {
  it('leaves routes without @MaskFields untouched', async () => {
    await expect(intercept({ data: record }, 'AUDITOR', false)).resolves.toEqual({ data: record });
  });

  it('masks each record in a list for the caller role and record entity', async () => {
    const result = (await intercept({ data: [record], meta: { page: 1 } }, 'HIRING_MANAGER')) as {
      data: Record<string, unknown>[];
      meta: unknown;
    };
    expect(result.meta).toEqual({ page: 1 });
    expect(result.data[0]?.employeeNo).toBe('E100023');
    expect(result.data[0]?.workPhone).toMatchObject({
      masked: true,
      classification: 'CONFIDENTIAL',
    });
    expect(result.data[0]?.baseSalary).toMatchObject({ masked: true, reason: 'ROLE_CLEARANCE' });
  });

  it('shows restricted fields to the HR team of the same entity', async () => {
    await expect(intercept({ data: record }, 'HR_SG')).resolves.toEqual({ data: record });
  });

  it('fails closed when the record entity is unknown', async () => {
    const result = (await intercept({ data: { ...record, entityCode: 'XX99' } }, 'HR_SG')) as {
      data: Record<string, unknown>;
    };
    expect(result.data.employeeNo).toMatchObject({ masked: true });
    expect(result.data.baseSalary).toMatchObject({ masked: true });
  });

  it('fails closed when there is no caller', async () => {
    const result = (await intercept({ data: record }, null)) as { data: Record<string, unknown> };
    expect(result.data.workPhone).toMatchObject({ masked: true });
  });
});
