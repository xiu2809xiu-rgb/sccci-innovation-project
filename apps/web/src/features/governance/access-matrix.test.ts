import { DEFAULT_CLEARANCE_RULES } from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import { entitiesCleared } from './access-matrix';

describe('entitiesCleared', () => {
  it("clears HR for restricted data on its own entity's records only", () => {
    expect(entitiesCleared(DEFAULT_CLEARANCE_RULES, 'HR_SG', 'RESTRICTED')).toEqual(['SG01']);
    expect(entitiesCleared(DEFAULT_CLEARANCE_RULES, 'HR_HQ', 'RESTRICTED')).toEqual(['CN01']);
  });

  it('applies a role-wide rule to every entity, and nothing to a level above it', () => {
    expect(entitiesCleared(DEFAULT_CLEARANCE_RULES, 'HR_HQ', 'CONFIDENTIAL')).toEqual([
      'SG01',
      'CN01',
      'MY01',
    ]);
    expect(entitiesCleared(DEFAULT_CLEARANCE_RULES, 'AUDITOR', 'CONFIDENTIAL')).toEqual([]);
  });
});
