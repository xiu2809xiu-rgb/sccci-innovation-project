import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { AccessPolicyService } from '../../modules/access/access-policy.service.js';
import { readMetadata, RequirePermissions } from '../decorators/route-metadata.js';
import { ForbiddenError, UnauthenticatedError } from '../errors/app-error.js';

/** Enforces @RequirePermissions(): the caller's role must hold every listed permission. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessPolicyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = readMetadata(this.reflector, RequirePermissions, context);
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthenticatedError();
    }
    if (!required.every((permission) => this.access.hasPermission(user.role, permission))) {
      throw new ForbiddenError();
    }
    return true;
  }
}
