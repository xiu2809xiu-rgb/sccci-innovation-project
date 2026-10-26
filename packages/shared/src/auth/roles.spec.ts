import { describe, expect, it } from 'vitest';

import { isReadOnlyRole, ROLES, roleSchema } from './roles.js';

describe('roles', () => {
  it('holds the six CLAUDE.md roles beside the earlier statement four', () => {
    for (const role of [
      'SYSTEM_ADMIN',
      'ASSESSOR',
      'OPERATIONS',
      'TRAINING_MANAGER',
      'MANAGEMENT',
      'AUDITOR',
    ] as const) {
      expect(ROLES).toContain(role);
    }
    expect(ROLES).toHaveLength(10);
  });

  it('appends new roles, as PostgreSQL appends them to its enum', () => {
    expect(ROLES.slice(-3)).toEqual(['ASSESSOR', 'OPERATIONS', 'TRAINING_MANAGER']);
  });

  it('rejects unknown roles at the boundary', () => {
    expect(roleSchema.safeParse('ROOT').success).toBe(false);
    expect(roleSchema.parse('ASSESSOR')).toBe('ASSESSOR');
    expect(roleSchema.parse('HR_SG')).toBe('HR_SG');
  });

  it('treats management and auditors as read-only', () => {
    expect(isReadOnlyRole('AUDITOR')).toBe(true);
    expect(isReadOnlyRole('MANAGEMENT')).toBe(true);
    expect(isReadOnlyRole('OPERATIONS')).toBe(false);
    expect(isReadOnlyRole('HR_HQ')).toBe(false);
  });
});
