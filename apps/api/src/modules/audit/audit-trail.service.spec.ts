import type { EntityCode } from '@huitong/shared';

import type { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import type { AccessPolicyService } from '../access/access-policy.service.js';
import type { AuditEventRow, AuditTrailRepository } from './audit-trail.repository.js';
import { AuditTrailService } from './audit-trail.service.js';

const MEI_LING = '0199a3b1-0c40-7e21-9f3a-000000000001';

function event(id: number, overrides: Partial<AuditEventRow>): AuditEventRow {
  return {
    id: BigInt(id),
    occurredAt: new Date('2026-10-20T03:00:00Z'),
    actorUserId: MEI_LING,
    actorRole: 'HR_SG',
    action: 'employee.updated',
    entityType: 'Employee',
    entityId: 'E100030',
    before: null,
    after: null,
    traceId: `trace-${String(id)}`,
    ...overrides,
  };
}

const EVENTS = [
  event(3, {
    before: { jobTitle: 'Analyst', baseSalary: 5200 },
    after: { jobTitle: 'Senior Analyst', baseSalary: 6100 },
  }),
  event(2, { entityId: 'E200014', actorRole: 'HR_HQ', actorUserId: null }),
  event(1, { action: 'conflict.resolved', entityType: 'Conflict', entityId: 'c-1' }),
];

/** SG01 viewers may list SG01 only; CN01 viewers both. */
const LISTABLE: Record<EntityCode, EntityCode[]> = {
  SG01: ['SG01'],
  CN01: ['CN01', 'SG01'],
  MY01: ['MY01'],
};

function serviceWith(events = EVENTS) {
  const repository = {
    events: vi.fn(() => Promise.resolve({ items: events, total: events.length })),
    entitiesOf: (employeeNos: readonly string[]) =>
      Promise.resolve(
        new Map(
          employeeNos.flatMap((no): [string, string][] =>
            no.startsWith('E1') ? [[no, 'SG01']] : no.startsWith('E2') ? [[no, 'CN01']] : [],
          ),
        ),
      ),
    displayNames: () => Promise.resolve(new Map([[MEI_LING, 'Tan Mei Ling']])),
  };
  const access = {
    listableEntities: (destination: EntityCode) => LISTABLE[destination],
  } as unknown as AccessPolicyService;
  const auditLog = {
    verifyChain: () => Promise.resolve({ valid: true, checked: 3, firstBrokenId: null }),
  } as unknown as AuditLogService;
  return {
    repository,
    service: new AuditTrailService(repository as unknown as AuditTrailRepository, auditLog, access),
  };
}

const viewer = (homeEntityCode: EntityCode) => ({
  id: 'u',
  role: 'AUDITOR' as const,
  homeEntityCode,
});
const query = { page: 1, pageSize: 25 };

describe('AuditTrailService', () => {
  it('names the actor and the changed fields, never the values', async () => {
    const { service } = serviceWith();
    const { items } = await service.events(query, viewer('SG01'));
    expect(items[0]).toMatchObject({
      id: '3',
      actorName: 'Tan Mei Ling',
      entityId: 'E100030',
      entityIdWithheld: false,
      changedFields: ['baseSalary', 'jobTitle'],
    });
    expect(JSON.stringify(items)).not.toMatch(/Senior Analyst|6100/);
  });

  it("keeps another entity's employee events in the log but withholds the employee", async () => {
    const { service } = serviceWith();
    const singapore = await service.events(query, viewer('SG01'));
    expect(singapore.total).toBe(3);
    expect(singapore.items[1]).toMatchObject({ entityId: null, entityIdWithheld: true });
    // Only Employee events name a person; a conflict's id is kept.
    expect(singapore.items[2]).toMatchObject({ entityId: 'c-1', entityIdWithheld: false });

    const hq = await service.events(query, viewer('CN01'));
    expect(hq.items[1]).toMatchObject({ entityId: 'E200014', entityIdWithheld: false });
  });

  it('finds nothing when filtering on a withheld employee, so the filter cannot probe', async () => {
    const { service, repository } = serviceWith();
    const result = await service.events(
      { ...query, entityType: 'Employee', entityId: 'E200014' },
      viewer('SG01'),
    );
    expect(result).toEqual({ items: [], total: 0 });
    expect(repository.events).not.toHaveBeenCalled();
  });

  it('withholds an employee the master no longer holds (default deny)', async () => {
    const { service } = serviceWith([event(9, { entityId: 'X-GONE' })]);
    const { items } = await service.events(query, viewer('CN01'));
    expect(items[0]).toMatchObject({ entityId: null, entityIdWithheld: true });
  });

  it('stamps when the chain was checked', async () => {
    const { service } = serviceWith();
    const result = await service.verify();
    expect(result).toMatchObject({ valid: true, checked: 3, firstBrokenId: null });
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });
});

/**
 * Test skeleton for area 4's additions to the audit-log viewer (story F-2).
 * The owner turns each case into a real test.
 */
describe('Audit-log viewer additions (F-2, area 4)', () => {
  it.todo('exports the filtered events as CSV, and audits the export itself');
  it.todo('verifies the chain on a schedule and raises an alert when it breaks');
  it.todo('keeps the audit log for its legal retention period, whatever the other retention rules');
});
