import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_COOKIES } from '@huitong/shared';
import type { Request } from 'express';

import type { AccessClaims, TokenService } from '../../modules/auth/token.service.js';
import { Public } from '../decorators/route-metadata.js';
import { UnauthenticatedError } from '../errors/app-error.js';
import { AuthGuard } from './auth.guard.js';

const claims: AccessClaims = {
  userId: '0199f0a0-0000-7000-8000-000000000001',
  role: 'HR_HQ',
  homeEntityCode: 'CN01',
};

const tokens = {
  verifyAccessToken: (token: string) => Promise.resolve(token === 'valid-token' ? claims : null),
} as unknown as TokenService;

/** A route handler, marked `@Public()` when asked. */
function route(isPublic: boolean): () => void {
  const handler = (): void => undefined;
  if (isPublic) {
    Public()(handler);
  }
  return handler;
}

function contextFor(
  handler: () => void,
  accessToken?: string,
): { context: ExecutionContext; request: Partial<Request> } {
  const request: Partial<Request> = {
    cookies: accessToken ? { [AUTH_COOKIES.access]: accessToken } : {},
  };
  const context = {
    getHandler: () => handler,
    // No class-level metadata in these cases.
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

const guard = new AuthGuard(new Reflector(), tokens);

describe('AuthGuard', () => {
  it('identifies the caller from a valid access cookie', async () => {
    const { context, request } = contextFor(route(false), 'valid-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: claims.userId, role: 'HR_HQ', homeEntityCode: 'CN01' });
  });

  it('rejects protected routes without a session cookie', async () => {
    await expect(guard.canActivate(contextFor(route(false)).context)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('rejects protected routes when the token is invalid, expired or tampered with', async () => {
    const { context, request } = contextFor(route(false), 'tampered-token');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(request.user).toBeUndefined();
  });

  it('lets anonymous callers reach public routes', async () => {
    const { context, request } = contextFor(route(true));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('still identifies signed-in callers on public routes', async () => {
    const { context, request } = contextFor(route(true), 'valid-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.role).toBe('HR_HQ');
  });
});
