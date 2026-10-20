import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_COOKIES, CSRF_HEADER } from '@huitong/shared';
import type { Request } from 'express';

import { csrfTokensMatch } from '../../modules/auth/csrf.js';
import { readCookie } from '../../modules/auth/session-cookies.js';
import { readMetadata, SkipCsrf } from '../decorators/route-metadata.js';
import { CsrfInvalidError } from '../errors/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for every state-changing request: the
 * `X-CSRF-Token` header must equal the `ht_csrf` cookie, which a page on
 * another origin can neither read nor set.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) {
      return true;
    }
    if (readMetadata(this.reflector, SkipCsrf, context) === true) {
      return true;
    }
    if (!csrfTokensMatch(readCookie(request, AUTH_COOKIES.csrf), request.header(CSRF_HEADER))) {
      throw new CsrfInvalidError();
    }
    return true;
  }
}
