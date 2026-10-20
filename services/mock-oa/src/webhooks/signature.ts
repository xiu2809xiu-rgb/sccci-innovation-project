import { createHmac } from 'node:crypto';

/**
 * Signature for a webhook delivery: `sha256=` plus the hex HMAC-SHA256 of
 * `<timestamp>.<raw body>`. Signing the timestamp lets receivers reject replays.
 */
export function signWebhook(secret: string, timestamp: number, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret)
    .update(`${String(timestamp)}.${rawBody}`)
    .digest('hex')}`;
}
