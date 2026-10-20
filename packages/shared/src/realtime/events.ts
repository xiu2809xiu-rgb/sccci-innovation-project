import { z } from 'zod';

/**
 * Envelope for every Server-Sent Event on `/api/v1/events`. `type` selects the
 * payload shape; feature areas add their own event types and payload schemas.
 */
export const realtimeEventSchema = z.object({
  id: z.string(),
  type: z.string().regex(/^[a-z]+(\.[a-z-]+)+$/, 'dotted event type, e.g. sync.progress'),
  occurredAt: z.iso.datetime(),
  data: z.unknown(),
});

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
