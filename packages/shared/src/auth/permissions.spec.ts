import { describe, expect, it } from 'vitest';

import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, roleHasPermission } from './permissions.js';
import { ROLES } from './roles.js';

describe('permissions', () => {
  it('grants every role at least one permission', () => {
    for (const role of ROLES) {
      expect(DEFAULT_ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('only grants permissions that exist', () => {
    for (const role of ROLES) {
      for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
  });

  it('separates duties: administrators cannot approve mappings or resolve HR conflicts', () => {
    expect(roleHasPermission('SYSTEM_ADMIN', 'mappings:approve')).toBe(false);
    expect(roleHasPermission('SYSTEM_ADMIN', 'conflicts:resolve')).toBe(false);
    expect(roleHasPermission('HR_SG', 'mappings:approve')).toBe(true);
  });

  it('keeps read-only roles away from every write permission', () => {
    const writes = PERMISSIONS.filter(
      (permission) => !permission.endsWith(':read') && permission !== 'reports:export',
    );
    for (const role of ['MANAGEMENT', 'AUDITOR'] as const) {
      for (const permission of writes) {
        expect(roleHasPermission(role, permission)).toBe(false);
      }
    }
  });

  it('lets only the audit-reading roles see the audit log', () => {
    const readers = ROLES.filter((role) => roleHasPermission(role, 'audit:read'));
    expect(readers.sort()).toEqual(['AUDITOR', 'SYSTEM_ADMIN']);
  });
});
