import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { roleSchema } from '../auth/roles.js';

/**
 * One event of the append-only audit log, as the viewer lists it. It names
 * the fields an event changed but never their values, which stay behind the
 * masking rules of the record they belong to.
 */
export const auditEventViewSchema = z.object({
  /** The log's sequence number, as text (it is a 64-bit integer). */
  id: z.string(),
  occurredAt: z.iso.datetime(),
  action: z.string(),
  /** Null for events a background job or an anonymous caller caused, such as a failed sign-in. */
  actorUserId: z.string().nullable(),
  actorName: z.string().nullable(),
  actorRole: roleSchema.nullable(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  /**
   * True when the event is about an employee of an entity the viewer may not
   * list, so `entityId` is left out (default deny across entities).
   */
  entityIdWithheld: z.boolean(),
  changedFields: z.array(z.string()),
  traceId: z.string().nullable(),
});

export type AuditEventView = z.infer<typeof auditEventViewSchema>;

export const auditEventQuerySchema = paginationQuerySchema
  .extend({
    entityType: z.string().trim().min(1).max(64).optional(),
    entityId: z.string().trim().min(1).max(64).optional(),
    /** Events one person caused (story F-2: by record, person and action). */
    actorUserId: z.uuid().optional(),
    /** Matches the action or its start, e.g. `conflict.` for every conflict event. */
    action: z.string().trim().min(1).max(64).optional(),
    /** Instants, so the caller decides which time zone a day starts in; `to` is exclusive. */
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .refine((query) => !query.from || !query.to || Date.parse(query.from) < Date.parse(query.to), {
    message: '`from` must be before `to`',
    path: ['to'],
  });

export type AuditEventQuery = z.infer<typeof auditEventQuerySchema>;

/** The result of recomputing every hash of the chain, oldest first. */
export const chainVerificationSchema = z.object({
  valid: z.boolean(),
  checked: z.number().int().min(0),
  /** The first event whose hash does not match, when the chain is broken. */
  firstBrokenId: z.string().nullable(),
  checkedAt: z.iso.datetime(),
});

export type ChainVerificationView = z.infer<typeof chainVerificationSchema>;
