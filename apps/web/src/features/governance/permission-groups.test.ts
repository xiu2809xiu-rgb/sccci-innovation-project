import { PERMISSIONS } from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import { permissionKey, PERMISSION_GROUPS } from './permission-groups';

describe('PERMISSION_GROUPS', () => {
  it('places every permission in exactly one group, so the matrix never drops one', () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => [...group.permissions]);
    expect([...grouped].sort()).toEqual([...PERMISSIONS].sort());
  });

  it('turns a permission into its translation key', () => {
    expect(permissionKey('leave-mappings:manage')).toBe('permissions.leave-mappings.manage');
  });
});
