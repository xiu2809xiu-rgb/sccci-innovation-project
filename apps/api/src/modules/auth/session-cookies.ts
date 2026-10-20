import { Injectable } from '@nestjs/common';
import { AUTH_COOKIES } from '@huitong/shared';
import type { CookieOptions, Request, Response } from 'express';

import { AppConfig } from '../../config/app-config.js';

/** Where the refresh cookie is sent: only to the auth endpoints, never to the rest of the API. */
const REFRESH_PATH = '/api/v1/auth';

/** Reads a cookie value as a string, whatever cookie-parser produced. */
export function readCookie(req: Request, name: string): string | undefined {
  const cookies: unknown = req.cookies;
  if (cookies === null || typeof cookies !== 'object') {
    return undefined;
  }
  const value: unknown = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Session cookies: httpOnly access and refresh tokens (SameSite=Strict,
 * Secure), plus a readable CSRF token the web app echoes in `X-CSRF-Token`.
 */
@Injectable()
export class SessionCookies {
  constructor(private readonly config: AppConfig) {}

  setSession(
    res: Response,
    tokens: { accessToken: string; refreshToken: string; csrfToken: string },
  ): void {
    res.cookie(
      AUTH_COOKIES.access,
      tokens.accessToken,
      this.options('/api', this.config.auth.accessTtlSeconds * 1000, true),
    );
    res.cookie(
      AUTH_COOKIES.refresh,
      tokens.refreshToken,
      this.options(REFRESH_PATH, this.config.auth.refreshTtlDays * 86_400_000, true),
    );
    this.setCsrf(res, tokens.csrfToken);
  }

  setCsrf(res: Response, csrfToken: string): void {
    res.cookie(
      AUTH_COOKIES.csrf,
      csrfToken,
      this.options('/', this.config.auth.refreshTtlDays * 86_400_000, false),
    );
  }

  clear(res: Response): void {
    res.clearCookie(AUTH_COOKIES.access, this.options('/api', 0, true));
    res.clearCookie(AUTH_COOKIES.refresh, this.options(REFRESH_PATH, 0, true));
  }

  private options(path: string, maxAge: number, httpOnly: boolean): CookieOptions {
    return { httpOnly, secure: this.config.auth.cookieSecure, sameSite: 'strict', path, maxAge };
  }
}
