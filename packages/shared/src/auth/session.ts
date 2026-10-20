import { z } from 'zod';

import { entityCodeSchema } from '../org/entities.js';
import { permissionSchema } from './permissions.js';
import { roleSchema } from './roles.js';

export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;

export const localeSchema = z.enum(SUPPORTED_LOCALES);

export type Locale = z.infer<typeof localeSchema>;

/** The signed-in user as the web app sees it (`GET /api/v1/auth/me`). */
export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  displayNameZh: z.string().nullable(),
  role: roleSchema,
  homeEntityCode: entityCodeSchema,
  employeeNo: z.string().nullable(),
  locale: localeSchema,
  permissions: z.array(permissionSchema),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const loginRequestSchema = z.strictObject({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Demo-only sign-in as the seeded user of a role; the API rejects it unless DEMO_MODE is on. */
export const demoLoginRequestSchema = z.strictObject({
  role: roleSchema,
});

export type DemoLoginRequest = z.infer<typeof demoLoginRequestSchema>;

/** Public sign-in options (`GET /api/v1/auth/options`): the web app hides demo sign-in unless it is on. */
export const authOptionsSchema = z.object({
  demoMode: z.boolean(),
});

export type AuthOptions = z.infer<typeof authOptionsSchema>;

/** Cookie and header names shared by the API and the web client. */
export const AUTH_COOKIES = {
  access: 'ht_access',
  refresh: 'ht_refresh',
  csrf: 'ht_csrf',
} as const;

export const CSRF_HEADER = 'X-CSRF-Token';
