import { employeeNoSchema, entityCodeSchema, oaApprovalTypeSchema } from '@huitong/shared';
import { z } from 'zod';

/**
 * The OA platform's webhook body, validated at the boundary. Only the fields
 * HuiTong uses are checked; OA may add others without breaking delivery.
 */
export const oaWebhookSchema = z.object({
  eventId: z.string().min(1).max(100),
  eventType: z.literal('approval.completed'),
  occurredAt: z.iso.datetime(),
  data: z.object({
    requestId: z.string().regex(/^OA-\d{4}-\d{6}$/),
    type: oaApprovalTypeSchema,
    title: z.string().max(200),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
    applicant: z.object({ employeeNo: employeeNoSchema }),
    entityCode: entityCodeSchema,
    formData: z.record(z.string().max(60), z.union([z.string().max(2000), z.number()])),
  }),
});

export type OaWebhook = z.infer<typeof oaWebhookSchema>;
