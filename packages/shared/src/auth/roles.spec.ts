import { describe, expect, it } from 'vitest';

import { isReadOnlyRole, ROLES, roleSchema } from './roles.js';

describe('roles', () => {
  it('defines exactly the seven CLAUDE.md roles', () => {
    expect(ROLES).toHaveLength(7);
  });

  it('rejects unknown roles at the boundary', () => {
    expect(roleSchema.safeParse('ROOT').success).toBe(false);
    expect(roleSchema.parse('HR_SG')).toBe('HR_SG');
  });

  it('treats management and auditors as read-only', () => {
    expect(isReadOnlyRole('AUDITOR')).toBe(true);
    expect(isReadOnlyRole('MANAGEMENT')).toBe(true);
    expect(isReadOnlyRole('HR_HQ')).toBe(false);
  });
});
