import { z } from 'zod';

import { roleSchema } from '../auth/roles.js';
import { notificationChannelSchema } from './notification-channel.js';

/**
 * What an instance's history records: the `WorkflowEvent.type` values. Area 2
 * may add types (an additive change); the UI translates each one.
 */
export const WORKFLOW_TIMELINE_TYPES = [
  'instance.started',
  'task.created',
  'task.completed',
  'task.blocked',
  'sla.reminder',
  'sla.escalation',
  'notification.sent',
  'notification.failed',
  'record.draft_created',
  'instance.completed',
  'instance.failed',
  'instance.cancelled',
] as const;

export const workflowTimelineTypeSchema = z.enum(WORKFLOW_TIMELINE_TYPES);

export type WorkflowTimelineType = z.infer<typeof workflowTimelineTypeSchema>;

export const workflowTimelineItemSchema = z.object({
  id: z.string(),
  type: workflowTimelineTypeSchema,
  occurredAt: z.iso.datetime(),
  /** The step the event concerns, if any. */
  stepKey: z.string().nullable(),
  /** Who acted, when a person did rather than the system. */
  actor: z.object({ name: z.string(), role: roleSchema }).nullable(),
  /** Where a notification went. */
  channel: notificationChannelSchema.nullable(),
});

export type WorkflowTimelineItem = z.infer<typeof workflowTimelineItemSchema>;
