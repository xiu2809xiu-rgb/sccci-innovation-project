import type { Permission } from '@huitong/shared';

/** The access matrix's row groups, so related permissions sit together (Gestalt proximity). */
export const PERMISSION_GROUPS = [
  {
    key: 'integration',
    permissions: [
      'employees:read',
      'employees:write',
      'employees:sync',
      'conflicts:resolve',
      'connectors:read',
      'connectors:manage',
      'mappings:propose',
      'mappings:approve',
    ],
  },
  {
    key: 'workflows',
    permissions: ['workflows:read', 'workflows:manage', 'workflows:tasks', 'manpower:request'],
  },
  {
    key: 'attendance',
    permissions: [
      'attendance:read',
      'attendance:consolidate',
      'leave-mappings:manage',
      'reports:read',
      'reports:export',
    ],
  },
  {
    key: 'oversight',
    permissions: [
      'governance:read',
      'governance:manage',
      'audit:read',
      'analytics:read',
      'ai-usage:read',
      'users:manage',
    ],
  },
] as const satisfies readonly { key: string; permissions: readonly Permission[] }[];

type Dotted<P extends string> = P extends `${infer Resource}:${infer Action}`
  ? `${Resource}.${Action}`
  : never;

/** The translation key of a permission: `employees:read` reads `permissions.employees.read`. */
export function permissionKey(permission: Permission): `permissions.${Dotted<Permission>}` {
  return `permissions.${permission.replace(':', '.')}` as `permissions.${Dotted<Permission>}`;
}
