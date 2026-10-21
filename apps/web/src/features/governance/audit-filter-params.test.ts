import { describe, expect, it } from 'vitest';

import {
  hasAuditFilters,
  readAuditFilters,
  toApiFilters,
  writeAuditFilters,
} from './audit-filter-params';

describe('audit filter parameters', () => {
  it('reads the record link the employee drawer opens (story F-2)', () => {
    const values = readAuditFilters(new URLSearchParams('entityType=Employee&entityId=E100030'));
    expect(values).toMatchObject({ entityType: 'Employee', entityId: 'E100030', action: '' });
    expect(hasAuditFilters(values)).toBe(true);
  });

  it('ignores an unknown action family and a malformed date', () => {
    const values = readAuditFilters(new URLSearchParams('action=drop&from=21/10/2026'));
    expect(values.action).toBe('');
    expect(values.from).toBe('');
    expect(hasAuditFilters(values)).toBe(false);
  });

  it('writes the filters back, keeps other parameters and starts at page 1', () => {
    const next = writeAuditFilters(new URLSearchParams('page=3&keep=1&entityId=E1'), {
      entityType: '',
      entityId: '',
      actorUserId: 'user-1',
      action: 'conflict',
      from: '',
      to: '',
    });
    expect(next.toString()).toBe('keep=1&actorUserId=user-1&action=conflict');
  });

  it("asks for whole local days: from that day's midnight to the next day's", () => {
    const api = toApiFilters({
      entityType: '',
      entityId: '',
      actorUserId: '',
      action: 'employee',
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(api.action).toBe('employee.');
    expect(api.from).toBe(new Date(2026, 9, 1).toISOString());
    expect(api.to).toBe(new Date(2026, 10, 1).toISOString());
    expect(api.entityType).toBeUndefined();
  });
});
