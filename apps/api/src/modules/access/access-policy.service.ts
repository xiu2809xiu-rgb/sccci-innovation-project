import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  clearanceRuleSchema,
  DEFAULT_CLEARANCE_RULES,
  DEFAULT_ROLE_PERMISSIONS,
  ENTITY_CODES,
  permissionSchema,
  ROLES,
  roleSchema,
  type ClearanceRule,
  type EntityCode,
  type Permission,
  type Role,
} from '@huitong/shared';
import { PinoLogger } from 'nestjs-pino';

import { AccessPolicyRepository } from './access-policy.repository.js';
import {
  disclosureOf,
  isListable,
  type ActiveTransfer,
  type Disclosure,
} from './destination-policy.js';

type Matrix = Record<Role, Permission[]>;

function defaultMatrix(): Matrix {
  return Object.fromEntries(
    ROLES.map((role) => [role, [...DEFAULT_ROLE_PERMISSIONS[role]]]),
  ) as Matrix;
}

/**
 * The live access policy: which permissions each role holds, how far each
 * role may see into classified data, and which fields each entity may receive
 * from another (the ACTIVE entries of the cross-border transfer register).
 * Loaded from the database (seeded from `@huitong/shared`), cached in memory,
 * and reloaded when area 4's administration screens change it. Rows that fail
 * validation are ignored.
 */
@Injectable()
export class AccessPolicyService implements OnModuleInit {
  private matrix: Matrix = defaultMatrix();
  private rules: ClearanceRule[] = [...DEFAULT_CLEARANCE_RULES];
  /** Until the register is read, nothing crosses entities (default deny). */
  private transfers: ActiveTransfer[] = [];

  constructor(
    private readonly repository: AccessPolicyRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AccessPolicyService.name);
  }

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** Re-reads the policy; keeps the shared defaults while the tables are empty (before seeding). */
  async reload(): Promise<void> {
    const [permissions, rules, transfers] = await Promise.all([
      this.repository.rolePermissions(),
      this.repository.clearanceRules(),
      this.repository.activeTransfers(),
    ]);
    this.transfers = transfers;
    if (permissions.length > 0) {
      const matrix = Object.fromEntries(ROLES.map((role) => [role, [] as Permission[]])) as Matrix;
      for (const row of permissions) {
        const role = roleSchema.safeParse(row.role);
        const permission = permissionSchema.safeParse(row.permission);
        if (role.success && permission.success) {
          matrix[role.data].push(permission.data);
        } else {
          this.logger.warn({ row }, 'ignoring invalid role permission');
        }
      }
      this.matrix = matrix;
    }
    if (rules.length > 0) {
      this.rules = rules.flatMap((row) => {
        const parsed = clearanceRuleSchema.safeParse({
          ...row,
          deniedReason: row.deniedReason ?? undefined,
        });
        return parsed.success ? [parsed.data] : [];
      });
    }
  }

  hasPermission(role: Role, permission: Permission): boolean {
    return this.matrix[role].includes(permission);
  }

  permissionsFor(role: Role): Permission[] {
    return [...this.matrix[role]];
  }

  clearanceRules(): readonly ClearanceRule[] {
    return this.rules;
  }

  /** What records of `source` may show to users whose own entity is `destination`. */
  disclosure(source: EntityCode, destination: EntityCode): Disclosure {
    return disclosureOf(this.transfers, source, destination);
  }

  /** The entities whose records users of `destination` may list: their own, and those sharing every directory field. */
  listableEntities(destination: EntityCode): EntityCode[] {
    return ENTITY_CODES.filter((source) => isListable(this.disclosure(source, destination)));
  }
}
