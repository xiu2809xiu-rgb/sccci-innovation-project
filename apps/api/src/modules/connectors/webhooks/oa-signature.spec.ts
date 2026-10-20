import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyOaSignature } from './oa-signature.js';

const secret = 'oa-test-webhook-secret';
const rawBody = Buffer.from('{"eventId":"e1","eventType":"approval.completed"}');
const now = new Date('2026-10-20T08:00:00Z');
const timestamp = String(Math.floor(now.getTime() / 1000));
const sign = (body: Buffer, at = timestamp, key = secret) =>
  `sha256=${createHmac('sha256', key)
    .update(`${at}.${body.toString('utf8')}`)
    .digest('hex')}`;

describe('verifyOaSignature', () => {
  it('accepts a correctly signed, fresh delivery', () => {
    expect(
      verifyOaSignature({ secret, rawBody, timestamp, signature: sign(rawBody), now }),
    ).toEqual({
      valid: true,
      timestamp: Number(timestamp),
    });
  });

  it('rejects a changed body, the wrong secret and a garbled signature', () => {
    const tampered = Buffer.from(rawBody.toString('utf8').replace('e1', 'e2'));
    const check = (signature: string, body = rawBody) =>
      verifyOaSignature({ secret, rawBody: body, timestamp, signature, now });
    expect(check(sign(rawBody), tampered)).toEqual({ valid: false, reason: 'BAD_SIGNATURE' });
    expect(check(sign(rawBody, timestamp, 'another-secret-value'))).toEqual({
      valid: false,
      reason: 'BAD_SIGNATURE',
    });
    expect(check('sha256=short')).toEqual({ valid: false, reason: 'BAD_SIGNATURE' });
  });

  it('rejects replays outside the five-minute window and requests missing headers', () => {
    const old = String(Number(timestamp) - 301);
    expect(
      verifyOaSignature({ secret, rawBody, timestamp: old, signature: sign(rawBody, old), now }),
    ).toEqual({
      valid: false,
      reason: 'STALE_TIMESTAMP',
    });
    expect(
      verifyOaSignature({ secret, rawBody, timestamp: undefined, signature: sign(rawBody), now }),
    ).toEqual({
      valid: false,
      reason: 'MISSING_HEADERS',
    });
    expect(
      verifyOaSignature({ secret, rawBody, timestamp: 'soon', signature: sign(rawBody), now }),
    ).toEqual({
      valid: false,
      reason: 'MISSING_HEADERS',
    });
  });
});
