import { randomBytes, timingSafeEqual } from 'node:crypto';

/** A fresh CSRF token for the double-submit pattern. */
export function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/** True when the header echoes the cookie exactly (constant-time comparison). */
export function csrfTokensMatch(cookie: string | undefined, header: string | undefined): boolean {
  if (!cookie || !header) {
    return false;
  }
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
