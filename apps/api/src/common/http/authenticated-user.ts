import type { EntityCode, Role } from '@huitong/shared';

/** The signed-in caller, attached to the request by the auth guard. */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  homeEntityCode: EntityCode;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
