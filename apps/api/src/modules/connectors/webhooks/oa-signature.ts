import { createHmac, timingSafeEqual } from 'node:crypto';

/** OA delivers within seconds; anything older than this is treated as a replay. */
export const REPLAY_WINDOW_SECONDS = 300;

export type SignatureCheck =
  | { valid: true; timestamp: number }
  | { valid: false; reason: 'MISSING_HEADERS' | 'STALE_TIMESTAMP' | 'BAD_SIGNATURE' };

export interface SignedRequest {
  secret: string;
  /** The exact bytes received: re-serialised JSON would not match the signature. */
  rawBody: Buffer;
  /** `X-OA-Timestamp`, unix seconds. */
  timestamp: string | undefined;
  /** `X-OA-Signature`, `sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>`. */
  signature: string | undefined;
  now: Date;
}

/**
 * Verifies an OA webhook: the signature over the raw body with a constant-time
 * comparison, and a timestamp inside the replay window. Event-id dedupe is the
 * caller's job (a unique key on the stored event).
 */
export function verifyOaSignature(request: SignedRequest): SignatureCheck {
  const { secret, rawBody, timestamp, signature, now } = request;
  if (!timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) {
    return { valid: false, reason: 'MISSING_HEADERS' };
  }
  const sentAt = Number(timestamp);
  if (Math.abs(now.getTime() / 1000 - sentAt) > REPLAY_WINDOW_SECONDS) {
    return { valid: false, reason: 'STALE_TIMESTAMP' };
  }
  const expected = Buffer.from(
    `sha256=${createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')}`,
  );
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }
  return { valid: true, timestamp: sentAt };
}
