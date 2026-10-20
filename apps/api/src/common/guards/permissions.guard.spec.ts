import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLE_PERMISSIONS, type Permission, type Role } from '@huitong/shared';

import type { AccessPolicyService } from '../../modules/access/access-policy.service.js';
import { RequirePermissions } from '../decorators/route-metadata.js';
import { ForbiddenError, UnauthenticatedError } from '../errors/app-error.js';
import { PermissionsGuard } from './permissions.guard.js';

/** A route handler carrying the same metadata `@RequirePermissions` puts on a controller method. */
function handlerRequiring(...permissions: Permission[]): () => void {
  const handler = (): void => undefined;
  if (permissions.length > 0) {
    RequirePermissions(permissions)(handler);
  }
  return handler;
}

function contextFor(handler: () => void, role?: Role): ExecutionContext {
  const user = role ? { id: 'user-1', role, homeEntityCode: 'SG01' } : undefined;
  return {
    getHandler: () => handler,
    // No class-level metadata in these cases.
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const access = {
  hasPermission: (role: Role, permission: Permission) =>
    DEFAULT_ROLE_PERMISSIONS[role].includes(permission),
} as unknown as AccessPolicyService;

const guard = new PermissionsGuard(new Reflector(), access);

describe('PermissionsGuard', () => {
  it('lets any signed-in caller through routes without @RequirePermissions', () => {
    expect(guard.canActivate(contextFor(handlerRequiring(), 'AUDITOR'))).toBe(true);
  });

  it('allows a role that holds every required permission', () => {
    const handler = handlerRequiring('employees:read', 'conflicts:resolve');
    expect(guard.canActivate(contextFor(handler, 'HR_SG'))).toBe(true);
  });

  it('forbids a role that lacks any one of the required permissions', () => {
    // Separation of duties: administrators cannot resolve HR data conflicts.
    const handler = handlerRequiring('employees:read', 'conflicts:resolve');
    expect(() => guard.canActivate(contextFor(handler, 'SYSTEM_ADMIN'))).toThrow(ForbiddenError);
  });

  it('keeps read-only roles away from writes', () => {
    const handler = handlerRequiring('employees:write');
    expect(() => guard.canActivate(contextFor(handler, 'MANAGEMENT'))).toThrow(ForbiddenError);
    expect(() => guard.canActivate(contextFor(handler, 'AUDITOR'))).toThrow(ForbiddenError);
  });

  it('demands a session before it checks permissions', () => {
    expect(() => guard.canActivate(contextFor(handlerRequiring('users:manage')))).toThrow(
      UnauthenticatedError,
    );
  });
});
