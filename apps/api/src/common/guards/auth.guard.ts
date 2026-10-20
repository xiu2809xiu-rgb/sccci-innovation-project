import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_COOKIES } from '@huitong/shared';
import type { Request } from 'express';

import { TokenService } from '../../modules/auth/token.service.js';
import { readCookie } from '../../modules/auth/session-cookies.js';
import { Public, readMetadata } from '../decorators/route-metadata.js';
import { UnauthenticatedError } from '../errors/app-error.js';

/**
 * Identifies the caller from the httpOnly access cookie. Every route requires a
 * signed-in user unless it is marked @Public(); public routes still learn who
 * the caller is when a valid cookie is present.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = readCookie(request, AUTH_COOKIES.access);
    const claims = token ? await this.tokens.verifyAccessToken(token) : null;
    if (claims) {
      request.user = {
        id: claims.userId,
        role: claims.role,
        homeEntityCode: claims.homeEntityCode,
      };
    }
    const isPublic = readMetadata(this.reflector, Public, context);
    if (isPublic === true || request.user) {
      return true;
    }
    throw new UnauthenticatedError();
  }
}
