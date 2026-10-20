import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { UnauthenticatedError } from '../errors/app-error.js';
import type { AuthenticatedUser } from '../http/authenticated-user.js';

/** Injects the signed-in user; rejects the request if there is none. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthenticatedError();
    }
    return request.user;
  },
);
