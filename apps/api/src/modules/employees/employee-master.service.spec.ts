import type { CanonicalEmployeePartial } from '@huitong/shared';
import { describe, expect, it, vi } from 'vitest';

import type { RequestMeta } from '../../common/http/request-meta.js';
import type { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { EmployeeMasterService, type SourceRecordInput } from './employee-master.service.js';
import type { EmployeesRepository } from './employees.repository.js';

const META: RequestMeta = { actor: null, ip: null, userAgent: null, traceId: 'test-trace' };

/** A new SG HR hire whose name is an existing employee's, written in the other order. */
const NEW_HIRE: CanonicalEmployeePartial = {
  employeeNo: 'E100990',
  entityCode: 'SG01',
  familyName: 'Tan',
  givenName: 'Wei Ming',
  fullNameLatin: 'Wei Ming Tan',
  workEmail: 'weiming.tan2@orge.example',
  departmentCode: 'WM',
  jobTitle: 'Relationship Manager',
  employmentType: 'FULL_TIME',
  employmentStatus: 'ACTIVE',
  hireDate: '2026-12-01',
  workLocation: 'SG-SIN',
};

function record(values: CanonicalEmployeePartial, syncRunId = 'run-1'): SourceRecordInput {
  return {
    connectorId: 'sg-hr',
    syncRunId,
    externalId: values.employeeNo ?? 'row-7',
    payload: {},
    payloadHash: `hash-${values.employeeNo ?? 'none'}`,
    values,
    observedAt: new Date('2026-10-21T02:00:00Z'),
  };
}

function setUp() {
  const employees = {
    sourceRecordHash: vi.fn().mockResolvedValue(null),
    findForMerge: vi.fn().mockResolvedValue(null),
    workEmailHolder: vi.fn().mockResolvedValue(null),
    identityFacts: vi.fn().mockResolvedValue([
      {
        employeeNo: 'E100003',
        entityCode: 'SG01',
        familyName: 'Tan',
        givenName: 'Wei Ming',
        fullNameLatin: 'Tan Wei Ming',
        fullNameLocal: '陈伟明',
        workEmail: 'weiming.tan@orge.example',
      },
    ]),
    transaction: vi.fn().mockResolvedValue(undefined),
  };
  const service = new EmployeeMasterService(
    employees as unknown as EmployeesRepository,
    { record: vi.fn() } as unknown as AuditLogService,
  );
  return { employees, service, policies: () => Promise.resolve(new Map<string, string | null>()) };
}

describe('EmployeeMasterService identity rule', () => {
  it('refuses a record without an employee number, whatever its name', async () => {
    const { service, employees, policies } = setUp();
    const { employeeNo: _omitted, ...nameless } = NEW_HIRE;
    const result = await service.merge(record(nameless), 'APPLY', policies, META);
    expect(result).toMatchObject({ kind: 'rejected', code: 'MISSING_EMPLOYEE_NO' });
    expect(employees.identityFacts).not.toHaveBeenCalled();
    expect(employees.transaction).not.toHaveBeenCalled();
  });

  it('previews a look-alike as a possible match, and creates the new record on its own', async () => {
    const { service, employees, policies } = setUp();
    const previewed = await service.merge(record(NEW_HIRE), 'PREVIEW', policies, META);
    expect(previewed).toMatchObject({ kind: 'created', employeeNo: 'E100990' });
    expect(previewed.kind === 'created' ? previewed.preview : []).toEqual([
      expect.objectContaining({
        employeeNo: 'E100990',
        kind: 'CREATE',
        possibleMatches: [
          { employeeNo: 'E100003', entityCode: 'SG01', reasons: ['SAME_LATIN_NAME'] },
        ],
      }),
    ]);
    expect(employees.transaction).not.toHaveBeenCalled();

    const applied = await service.merge(record(NEW_HIRE, 'run-2'), 'APPLY', policies, META);
    expect(applied).toMatchObject({ kind: 'created', employeeNo: 'E100990' });
    // Only the new number was looked up to merge into; E100003 is never touched.
    expect(employees.findForMerge.mock.calls).toEqual([['E100990'], ['E100990']]);
    expect(employees.transaction).toHaveBeenCalledTimes(1);
    // An APPLY keeps no preview, so it does not compare identities at all.
    expect(employees.identityFacts).toHaveBeenCalledTimes(1);
  });

  it('reads the identity details once per preview run, however many records it creates', async () => {
    const { service, employees, policies } = setUp();
    const second = { ...NEW_HIRE, employeeNo: 'E100991', workEmail: 'other@orge.example' };
    await service.merge(record(NEW_HIRE), 'PREVIEW', policies, META);
    await service.merge(record(second), 'PREVIEW', policies, META);
    expect(employees.identityFacts).toHaveBeenCalledTimes(1);
    await service.merge(record(NEW_HIRE, 'run-3'), 'PREVIEW', policies, META);
    expect(employees.identityFacts).toHaveBeenCalledTimes(2);
  });

  it.each(['PREVIEW', 'APPLY'] as const)(
    'refuses a work email another employee already has, in a %s, instead of failing the run',
    async (mode) => {
      const { service, employees, policies } = setUp();
      employees.workEmailHolder.mockResolvedValue('E100003');
      const result = await service.merge(record(NEW_HIRE), mode, policies, META);
      expect(result).toMatchObject({ kind: 'rejected', code: 'WORK_EMAIL_IN_USE' });
      expect(result.kind === 'rejected' ? result.message : '').toContain('E100003');
      expect(employees.workEmailHolder).toHaveBeenCalledWith(
        'weiming.tan2@orge.example',
        'E100990',
      );
      expect(employees.transaction).not.toHaveBeenCalled();
    },
  );
});
