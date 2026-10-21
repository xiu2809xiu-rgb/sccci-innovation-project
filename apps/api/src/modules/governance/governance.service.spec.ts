import {
  DEFAULT_CLEARANCE_RULES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  type Role,
} from '@huitong/shared';

import type { AccessPolicyService } from '../access/access-policy.service.js';
import type { GovernanceRepository } from './governance.repository.js';
import { GovernanceService } from './governance.service.js';

const meta = { actor: null, ip: null, userAgent: null, traceId: 'trace' };

function serviceWith() {
  const access = {
    permissionsFor: (role: Role) => [...DEFAULT_ROLE_PERMISSIONS[role]],
    clearanceRules: () => DEFAULT_CLEARANCE_RULES,
  } as unknown as AccessPolicyService;
  return new GovernanceService({} as GovernanceRepository, access);
}

describe('GovernanceService', () => {
  it('shows the policy the guard enforces: every role, its permissions and its clearance', () => {
    const matrix = serviceWith().accessMatrix();
    expect(matrix.permissions).toEqual([...PERMISSIONS]);
    expect(matrix.roles.map((row) => row.role)).toEqual([...ROLES]);
    const auditor = matrix.roles.find((row) => row.role === 'AUDITOR');
    expect(auditor?.permissions).toEqual([...DEFAULT_ROLE_PERMISSIONS.AUDITOR]);
    const hq = matrix.roles.find((row) => row.role === 'HR_HQ');
    expect(hq?.clearance).toEqual(
      DEFAULT_CLEARANCE_RULES.filter((rule) => rule.role === 'HR_HQ').map((rule) => ({
        entityCode: rule.entityCode,
        maxLevel: rule.maxLevel,
      })),
    );
  });

  it('leaves changing the transfer register to area 4', async () => {
    await expect(
      serviceWith().changeTransferStatus(
        'transfer',
        { status: 'ACTIVE', reason: 'DPO approved' },
        meta,
      ),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', status: 501 });
  });
});
