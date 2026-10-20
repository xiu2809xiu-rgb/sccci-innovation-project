import { z } from 'zod';

import type { Role } from './roles.js';

/**
 * Every permission the API checks. Routes declare the permissions they need;
 * roles are granted permissions through {@link DEFAULT_ROLE_PERMISSIONS}.
 */
export const PERMISSIONS = [
  'employees:read',
  'employees:write',
  'employees:sync',
  'conflicts:resolve',
  'connectors:read',
  'connectors:manage',
  'mappings:propose',
  'mappings:approve',
  'workflows:read',
  'workflows:manage',
  'workflows:tasks',
  'manpower:request',
  'attendance:read',
  'attendance:consolidate',
  'leave-mappings:manage',
  'reports:read',
  'reports:export',
  'governance:read',
  'governance:manage',
  'audit:read',
  'analytics:read',
  'ai-usage:read',
  'users:manage',
] as const;

export const permissionSchema = z.enum(PERMISSIONS);

export type Permission = z.infer<typeof permissionSchema>;

const HR_PERMISSIONS: readonly Permission[] = [
  'employees:read',
  'employees:write',
  'employees:sync',
  'conflicts:resolve',
  'connectors:read',
  'mappings:propose',
  'mappings:approve',
  'workflows:read',
  'workflows:manage',
  'workflows:tasks',
  'attendance:read',
  'attendance:consolidate',
  'leave-mappings:manage',
  'reports:read',
  'reports:export',
  'governance:read',
];

/**
 * Baseline role-permission matrix, seeded into the database and administered by
 * area 4. Separation of duties: system administrators configure the platform
 * but cannot approve mappings or resolve HR data conflicts.
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  SYSTEM_ADMIN: [
    'employees:read',
    'employees:sync',
    'connectors:read',
    'connectors:manage',
    'workflows:read',
    'attendance:read',
    'reports:read',
    'governance:read',
    'governance:manage',
    'audit:read',
    'analytics:read',
    'ai-usage:read',
    'users:manage',
  ],
  HR_SG: HR_PERMISSIONS,
  HR_HQ: HR_PERMISSIONS,
  HIRING_MANAGER: ['employees:read', 'manpower:request', 'workflows:read', 'workflows:tasks'],
  ADMIN_OPS: ['employees:read', 'workflows:read', 'workflows:tasks'],
  MANAGEMENT: [
    'employees:read',
    'connectors:read',
    'workflows:read',
    'attendance:read',
    'reports:read',
    'reports:export',
    'analytics:read',
  ],
  AUDITOR: [
    'employees:read',
    'connectors:read',
    'workflows:read',
    'attendance:read',
    'reports:read',
    'governance:read',
    'audit:read',
    'analytics:read',
    'ai-usage:read',
  ],
};

/** True when the role holds the permission in the given matrix (defaults to the baseline). */
export function roleHasPermission(
  role: Role,
  permission: Permission,
  matrix: Readonly<Record<Role, readonly Permission[]>> = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  return matrix[role].includes(permission);
}
