import { z } from 'zod';

export const APPROVAL_TYPES = [
  'MANPOWER_REQUEST',
  'OFFICE_RENTAL',
  'EXPENSE_CLAIM',
  'IT_ASSET_PURCHASE',
  'PAYMENT_APPROVAL',
] as const;

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;

const approvalStepSchema = z.strictObject({
  node: z.string(),
  approver: z.string(),
  action: z.enum(['SUBMIT', 'APPROVE', 'REJECT', 'PENDING']),
  at: z.iso.datetime().nullable(),
  comment: z.string().nullable(),
});

/** A request as the OA platform returns it: English top-level keys, Chinese form fields. */
export const oaApprovalSchema = z.strictObject({
  requestId: z.string().regex(/^OA-\d{4}-\d{6}$/),
  type: z.enum(APPROVAL_TYPES),
  workflowName: z.string(),
  title: z.string(),
  status: z.enum(APPROVAL_STATUSES),
  applicant: z.strictObject({
    employeeNo: z.string(),
    name: z.string(),
    departmentCode: z.string(),
  }),
  entityCode: z.enum(['SG01', 'CN01']),
  submittedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  formData: z.record(z.string(), z.union([z.string(), z.number()])),
  approvalChain: z.array(approvalStepSchema).min(2),
});

export type OaApproval = z.infer<typeof oaApprovalSchema>;

export type OaApprovalStep = z.infer<typeof approvalStepSchema>;

export const approvalListQuerySchema = z.object({
  type: z.enum(APPROVAL_TYPES).optional(),
  status: z.enum(APPROVAL_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const createApprovalSchema = z.strictObject({
  type: z.enum(APPROVAL_TYPES),
  title: z.string().min(1).max(200),
  applicantEmployeeNo: z.string().regex(/^E\d{6}$/),
  formData: z.record(z.string().max(40), z.union([z.string().max(500), z.number()])),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;

export const approvalActionSchema = z.strictObject({
  action: z.enum(['APPROVE', 'REJECT']),
  approver: z.string().min(1).max(100),
  comment: z.string().max(500).optional(),
});

export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;

export const subscriptionSchema = z.strictObject({
  url: z.url(),
  events: z.array(z.literal('approval.completed')).min(1),
});

/** Optional overrides for the simulated manpower request. */
export const simulateManpowerSchema = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  headcount: z.number().int().min(1).max(20).optional(),
  startDate: z.iso.date().optional(),
});

/** The body OA posts to webhook subscribers. */
export const webhookEventSchema = z.strictObject({
  eventId: z.uuid(),
  eventType: z.literal('approval.completed'),
  occurredAt: z.iso.datetime(),
  data: oaApprovalSchema,
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
