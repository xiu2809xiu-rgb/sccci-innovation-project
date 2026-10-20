import { randomUUID } from 'node:crypto';

import type { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.js';

/** Who did something and from where: the context every audit event records. */
export interface RequestMeta {
  actor: AuthenticatedUser | null;
  ip: string | null;
  userAgent: string | null;
  traceId: string;
}

/** The request id (set by the logger from X-Request-Id), which doubles as the trace id. */
export function traceIdOf(req: Request): string {
  return typeof req.id === 'string' ? req.id : randomUUID();
}

/** Reads the audit context from a request. */
export function requestMeta(req: Request): RequestMeta {
  return {
    actor: req.user ?? null,
    ip: req.ip ?? null,
    userAgent: req.header('user-agent') ?? null,
    traceId: traceIdOf(req),
  };
}
