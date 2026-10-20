import type { ErrorCode } from '@huitong/shared';

/** Client-side failures that never reached (or never came back from) the API. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'CONTRACT_MISMATCH';

/**
 * A failed API call. `code` comes from the server's error envelope (or a
 * client-side code), and `traceId` is shown in error states so users can quote it.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | ClientErrorCode,
    message: string,
    readonly traceId: string | null,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True for failures where signing in again is the fix. */
  get isAuthError(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.code === 'SESSION_EXPIRED';
  }
}
