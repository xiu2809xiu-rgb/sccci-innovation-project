import type { AuthOptions } from '@huitong/shared';

/** Injection token for the auth module's options (set by AuthModule.forRoot). */
export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

export type { AuthOptions };
