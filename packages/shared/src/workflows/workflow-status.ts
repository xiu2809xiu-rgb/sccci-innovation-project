import { z } from 'zod';

/**
 * Mirrors the Prisma enum `WorkflowInstanceStatus`. WAITING: paused on
 * something outside HuiTong, such as a candidate's answer to an offer.
 */
export const WORKFLOW_INSTANCE_STATUSES = [
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export const workflowInstanceStatusSchema = z.enum(WORKFLOW_INSTANCE_STATUSES);

export type WorkflowInstanceStatus = z.infer<typeof workflowInstanceStatusSchema>;

/** Mirrors the Prisma enum `WorkflowTaskStatus`. */
export const WORKFLOW_TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'BLOCKED',
  'SKIPPED',
] as const;

export const workflowTaskStatusSchema = z.enum(WORKFLOW_TASK_STATUSES);

export type WorkflowTaskStatus = z.infer<typeof workflowTaskStatusSchema>;

/**
 * Where open work stands against its SLA. Area 2's SLA rules decide when work
 * is DUE_SOON; finished work is ON_TRACK.
 */
export const SLA_STATES = ['ON_TRACK', 'DUE_SOON', 'OVERDUE'] as const;

export const slaStateSchema = z.enum(SLA_STATES);

export type SlaState = z.infer<typeof slaStateSchema>;
