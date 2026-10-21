import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { roleSchema } from '../auth/roles.js';
import { entityCodeSchema } from '../org/entities.js';
import { workflowPersonSchema } from './workflow-instance.js';
import { slaStateSchema, workflowTaskStatusSchema } from './workflow-status.js';

/** A row of the task list. */
export const workflowTaskViewSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  instanceTitle: z.string(),
  entityCode: entityCodeSchema,
  stepKey: z.string(),
  title: z.string(),
  titleZh: z.string(),
  assigneeRole: roleSchema,
  /** The person working on it, once someone has picked it up. */
  assignee: workflowPersonSchema.nullable(),
  status: workflowTaskStatusSchema,
  dueAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  sla: slaStateSchema,
});

export type WorkflowTaskView = z.infer<typeof workflowTaskViewSchema>;

/** `mine`: tasks assigned to the caller's role. `all` needs `workflows:manage`. */
export const WORKFLOW_TASK_SCOPES = ['mine', 'all'] as const;

export const workflowTaskScopeSchema = z.enum(WORKFLOW_TASK_SCOPES);

export type WorkflowTaskScope = z.infer<typeof workflowTaskScopeSchema>;

/** `open`: pending, in progress or blocked. `done`: done or skipped. */
export const WORKFLOW_TASK_STATES = ['open', 'done', 'all'] as const;

export const workflowTaskStateSchema = z.enum(WORKFLOW_TASK_STATES);

export type WorkflowTaskState = z.infer<typeof workflowTaskStateSchema>;

export const workflowTaskListQuerySchema = paginationQuerySchema.extend({
  scope: workflowTaskScopeSchema.default('mine'),
  state: workflowTaskStateSchema.default('open'),
  sla: slaStateSchema.optional(),
});

export type WorkflowTaskListQuery = z.infer<typeof workflowTaskListQuerySchema>;

/** Body of `POST /workflows/tasks/:taskId/complete`. */
export const completeWorkflowTaskSchema = z.object({
  /** Kept with the audit event. */
  note: z.string().trim().max(500).optional(),
});

export type CompleteWorkflowTask = z.infer<typeof completeWorkflowTaskSchema>;
