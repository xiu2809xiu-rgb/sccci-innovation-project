import { z } from 'zod';

/** The seven RBAC roles from CLAUDE.md section 4. */
export const ROLES = [
  'SYSTEM_ADMIN',
  'HR_SG',
  'HR_HQ',
  'HIRING_MANAGER',
  'ADMIN_OPS',
  'MANAGEMENT',
  'AUDITOR',
] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;

/** Roles whose access is read-only everywhere in the product. */
export const READ_ONLY_ROLES: readonly Role[] = ['MANAGEMENT', 'AUDITOR'];

/** True when the role may not perform any write. */
export function isReadOnlyRole(role: Role): boolean {
  return READ_ONLY_ROLES.includes(role);
}
