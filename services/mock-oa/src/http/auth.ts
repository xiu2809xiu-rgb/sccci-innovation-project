import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import { HttpError } from './errors.js';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Requires `Authorization: Bearer <token>`, compared as hashes in constant time. */
export function requireBearerToken(token: string): RequestHandler {
  const expected = digest(token);
  return (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const supplied = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (!timingSafeEqual(digest(supplied), expected)) {
      next(new HttpError(401, 40100, 'invalid token'));
      return;
    }
    next();
  };
}
