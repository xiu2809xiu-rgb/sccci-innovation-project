import { z } from 'zod';

import { localeSchema } from '../auth/session.js';

export const CLICKSTREAM_EVENT_TYPES = ['page_view', 'click', 'feature_use', 'error'] as const;

export const clickstreamEventTypeSchema = z.enum(CLICKSTREAM_EVENT_TYPES);

/**
 * Property values are short scalars only. Free text could carry personal data,
 * so the tracker sends identifiers and enums, never user input.
 */
const propertyValueSchema = z.union([z.string().max(120), z.number(), z.boolean()]);

/**
 * One first-party analytics event. `route` is the route pattern
 * (`/employees/:employeeNo`), never the concrete URL, and `sessionId` is a random
 * per-tab id that is not linked to the user account.
 */
export const clickstreamEventSchema = z.strictObject({
  type: clickstreamEventTypeSchema,
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9._-]*$/, 'lowercase dotted identifier'),
  route: z.string().min(1).max(160).startsWith('/'),
  occurredAt: z.iso.datetime(),
  sessionId: z.uuid(),
  locale: localeSchema.optional(),
  theme: z.enum(['light', 'dark']).optional(),
  viewport: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  properties: z.record(z.string().max(40), propertyValueSchema).optional(),
});

export type ClickstreamEvent = z.infer<typeof clickstreamEventSchema>;

export const MAX_CLICKSTREAM_BATCH = 50;

export const clickstreamBatchSchema = z.strictObject({
  events: z.array(clickstreamEventSchema).min(1).max(MAX_CLICKSTREAM_BATCH),
});

export type ClickstreamBatch = z.infer<typeof clickstreamBatchSchema>;
