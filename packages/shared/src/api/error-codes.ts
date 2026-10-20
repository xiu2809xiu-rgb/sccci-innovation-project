import { z } from 'zod';

/**
 * Machine-readable error codes in the error envelope. The web app translates
 * each one through the i18n key `errors.<CODE>`.
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'CSRF_INVALID',
  'NOT_FOUND',
  'CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'DEMO_MODE_DISABLED',
  'WEBHOOK_SIGNATURE_INVALID',
  'UPSTREAM_UNAVAILABLE',
  'AI_OUTPUT_INVALID',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof errorCodeSchema>;
