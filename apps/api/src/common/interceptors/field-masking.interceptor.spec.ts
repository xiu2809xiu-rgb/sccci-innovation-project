import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_CLEARANCE_RULES, EMPLOYEE_FIELD_CLASSIFICATION, type Role } from '@huitong/shared';
import { firstValueFrom, of } from 'rxjs';

import type { AccessPolicyService } from '../../modules/access/access-policy.service.js';
import { disclosureOf } from '../../modules/access/destination-policy.js';
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
  dateOfBirth: '1992-07-04',
  baseSalary: { amount: 5800, currency: 'SGD' },
};

/** SG01 shares identity, job, contact and grade fields with HQ, but not dates of birth. */
const TRANSFERS = [
  {
    id: 'sg-to-hq',
    fromEntityCode: 'SG01',
    toEntityCode: 'CN01',
    dataCategories: ['identity', 'job-and-organisation', 'work-contact', 'jobGrade'],
    version: 2,
  },
];

async function intercept(
  body: unknown,
  role: Role | null,
  withSpec = true,
  homeEntityCode = 'SG01',
): Promise<unknown> {
  const reflector = {
    getAllAndOverride: vi.fn(() => (withSpec ? spec : undefined)),
  } as unknown as Reflector;
  const access = {
    clearanceRules: () => DEFAULT_CLEARANCE_RULES,
    disclosure: (source: 'SG01' | 'CN01', destination: 'SG01' | 'CN01') =>
      disclosureOf(TRANSFERS, source, destination),
  } as unknown as AccessPolicyService;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 'u', role, homeEntityCode } : undefined }),
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

  it("withholds what the register does not share with the caller's entity, though the role is cleared", async () => {
    const result = (await intercept({ data: record }, 'HR_HQ', true, 'CN01')) as {
      data: Record<string, unknown>;
    };
    expect(result.data.workPhone).toBe('+6591234567');
    expect(result.data.dateOfBirth).toEqual({
      masked: true,
      classification: 'CONFIDENTIAL',
      reason: 'CROSS_BORDER_NOT_APPROVED',
    });
    expect(result.data.baseSalary).toMatchObject({
      masked: true,
      reason: 'CROSS_BORDER_NOT_APPROVED',
    });
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
