/**
 * The BullMQ queues shared by every area. Each area registers its own
 * processor for its queue (`@Processor(QUEUES.sync)` and so on).
 */
export const QUEUES = {
  /** Area 1: connector syncs into the employee master. */
  sync: 'sync',
  /** Area 1: republishes stored webhooks whose domain event was never handled (outbox). */
  webhooks: 'webhooks',
  /** Area 2: workflow steps triggered by domain events. */
  workflow: 'workflow',
  /** Area 2: Teams and DingTalk notifications (mocked). */
  notifications: 'notifications',
  /** Area 3: monthly attendance and leave consolidation. */
  consolidation: 'consolidation',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
