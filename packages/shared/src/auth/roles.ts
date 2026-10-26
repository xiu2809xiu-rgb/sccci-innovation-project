import { z } from 'zod';

/**
 * The RBAC roles. CLAUDE.md section 4 names six: SYSTEM_ADMIN, ASSESSOR,
 * OPERATIONS, TRAINING_MANAGER, MANAGEMENT and AUDITOR. The earlier statement's
 * HR_SG, HR_HQ, HIRING_MANAGER and ADMIN_OPS stay until no area uses them (ADR
 * 0023). New roles are appended, as PostgreSQL appends them to its enum.
 */
export const ROLES = [
  'SYSTEM_ADMIN',
  'HR_SG',
  'HR_HQ',
  'HIRING_MANAGER',
  'ADMIN_OPS',
  'MANAGEMENT',
  'AUDITOR',
  'ASSESSOR',
  'OPERATIONS',
  'TRAINING_MANAGER',
] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;

/** Roles whose access is read-only everywhere in the product. */
export const READ_ONLY_ROLES: readonly Role[] = ['MANAGEMENT', 'AUDITOR'];

/** True when the role may not perform any write. */
export function isReadOnlyRole(role: Role): boolean {
  return READ_ONLY_ROLES.includes(role);
}
