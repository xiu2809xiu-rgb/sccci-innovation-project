import { z } from 'zod';

import { employeeNoSchema } from '../employees/canonical-employee.js';
import { entityCodeSchema } from '../org/entities.js';

/**
 * Domain events between modules (ADR 0008). Published in-process after the
 * publishing transaction commits; handlers validate the payload and enqueue
 * durable work.
 */
export const DOMAIN_EVENTS = {
  /** Area 1 publishes it once the OA webhook is verified and stored; area 2 subscribes. */
  oaApprovalCompleted: 'oa.approval.completed',
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

/** Request types raised in the OA platform (facts sheet section 7). */
export const OA_APPROVAL_TYPES = [
  'MANPOWER_REQUEST',
  'OFFICE_RENTAL',
  'EXPENSE_CLAIM',
  'IT_ASSET_PURCHASE',
  'PAYMENT_APPROVAL',
] as const;

export const oaApprovalTypeSchema = z.enum(OA_APPROVAL_TYPES);

export type OaApprovalType = z.infer<typeof oaApprovalTypeSchema>;

export const oaApprovalCompletedSchema = z.object({
  /** Id of the stored InboundWebhookEvent: the outbox row a handler marks as handled. */
  inboundEventId: z.uuid(),
  /** OA's own event id; handlers ignore ids they have already processed. */
  oaEventId: z.string(),
  occurredAt: z.iso.datetime(),
  requestId: z.string(),
  requestType: oaApprovalTypeSchema,
  outcome: z.enum(['APPROVED', 'REJECTED']),
  entityCode: entityCodeSchema,
  applicantEmployeeNo: employeeNoSchema,
  title: z.string(),
  formData: z.record(z.string(), z.union([z.string(), z.number()])),
});

export type OaApprovalCompleted = z.infer<typeof oaApprovalCompletedSchema>;

/** The payload each domain event carries. */
export interface DomainEventPayloads {
  'oa.approval.completed': OaApprovalCompleted;
}
