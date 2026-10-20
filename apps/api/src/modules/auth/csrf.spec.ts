import { createCsrfToken, csrfTokensMatch } from './csrf.js';

describe('CSRF double-submit tokens', () => {
  it('creates unpredictable URL-safe tokens', () => {
    const a = createCsrfToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(createCsrfToken()).not.toBe(a);
  });

  it('matches only an identical cookie and header', () => {
    const token = createCsrfToken();
    expect(csrfTokensMatch(token, token)).toBe(true);
    expect(csrfTokensMatch(token, createCsrfToken())).toBe(false);
    expect(csrfTokensMatch(token, `${token}x`)).toBe(false);
    expect(csrfTokensMatch(undefined, token)).toBe(false);
    expect(csrfTokensMatch(token, undefined)).toBe(false);
  });
});
