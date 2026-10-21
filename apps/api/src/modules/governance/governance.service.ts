import { Injectable } from '@nestjs/common';
import {
  PERMISSIONS,
  ROLES,
  type AccessMatrix,
  type ChangeTransferStatus,
  type ClassificationEntry,
  type GovernanceListQuery,
  type RetentionPolicy,
  type TransferEntry,
} from '@huitong/shared';

import { NotImplementedError } from '../../common/errors/app-error.js';
import type { Page } from '../../common/http/page.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { GovernanceRepository } from './governance.repository.js';

/**
 * Governance use cases (area 4). The reads are complete; administering the
 * matrix, the classification, the register and retention is area 4's to
 * build, each change audited.
 */
@Injectable()
export class GovernanceService {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly access: AccessPolicyService,
  ) {}

  /** The policy the API enforces right now, so the screen can never disagree with the guard. */
  accessMatrix(): AccessMatrix {
    const rules = this.access.clearanceRules();
    return {
      permissions: [...PERMISSIONS],
      roles: ROLES.map((role) => ({
        role,
        permissions: this.access.permissionsFor(role),
        clearance: rules
          .filter((rule) => rule.role === role)
          .map((rule) => ({ entityCode: rule.entityCode, maxLevel: rule.maxLevel })),
      })),
    };
  }

  classifications(query: GovernanceListQuery): Promise<Page<ClassificationEntry>> {
    return this.repository.classifications(query);
  }

  transfers(query: GovernanceListQuery): Promise<Page<TransferEntry>> {
    return this.repository.transfers(query);
  }

  retention(query: GovernanceListQuery): Promise<Page<RetentionPolicy>> {
    return this.repository.retention(query);
  }

  /**
   * Approves, suspends or expires a register entry (story F-4). Area 4
   * implements it: audit the change with its reason, raise the version when
   * what the entry covers changes, and call AccessPolicyService.reload() so
   * the allowlist area 1 enforces follows at once.
   */
  changeTransferStatus(
    _transferId: string,
    _body: ChangeTransferStatus,
    _meta: RequestMeta,
  ): Promise<TransferEntry> {
    return Promise.reject(
      new NotImplementedError('Changing a transfer register entry', 'area 4 (F-4)'),
    );
  }
}
