import { createHash, timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import { HttpError } from './errors.js';

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * HTTP Basic authentication, as SAP gateways commonly use for technical users.
 * Credentials are compared as hashes, in constant time.
 */
export function requireBasicAuth(username: string, password: string): RequestHandler {
  const expected = digest(`${username}:${password}`);
  return (req, _res, next) => {
    const header = req.header('authorization') ?? '';
    const [scheme, encoded] = header.split(' ');
    const supplied =
      scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
    if (!timingSafeEqual(digest(supplied), expected)) {
      next(new HttpError(401, 'E401', '认证失败'));
      return;
    }
    next();
  };
}
