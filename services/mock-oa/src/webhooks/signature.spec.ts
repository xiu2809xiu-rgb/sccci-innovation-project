import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { signWebhook } from './signature.js';

describe('signWebhook', () => {
  const body = '{"eventId":"abc"}';

  it('signs "<timestamp>.<raw body>" with HMAC-SHA256', () => {
    const expected = createHmac('sha256', 'secret-value-123')
      .update(`1792468800.${body}`)
      .digest('hex');
    expect(signWebhook('secret-value-123', 1792468800, body)).toBe(`sha256=${expected}`);
  });

  it('changes when the body, timestamp or secret changes', () => {
    const base = signWebhook('secret-value-123', 1792468800, body);
    expect(signWebhook('secret-value-123', 1792468801, body)).not.toBe(base);
    expect(signWebhook('secret-value-123', 1792468800, `${body} `)).not.toBe(base);
    expect(signWebhook('another-secret-12', 1792468800, body)).not.toBe(base);
  });
});
