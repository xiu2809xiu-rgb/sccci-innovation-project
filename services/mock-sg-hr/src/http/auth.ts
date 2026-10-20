import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import { HttpError } from './errors.js';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Requires `X-API-Key` to match. Both sides are hashed first so the comparison
 * is constant-time regardless of the supplied key's length.
 */
export function requireApiKey(expected: string): RequestHandler {
  const expectedDigest = digest(expected);
  return (req, _res, next) => {
    const supplied = req.header('x-api-key');
    if (supplied === undefined || !timingSafeEqual(digest(supplied), expectedDigest)) {
      next(new HttpError(401, 'unauthorized', 'Invalid or missing API key'));
      return;
    }
    next();
  };
}
