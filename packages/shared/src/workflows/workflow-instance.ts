import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { roleSchema } from '../auth/roles.js';
import { employeeNoSchema } from '../employees/canonical-employee.js';
import { employmentStatusSchema } from '../employees/employment.js';
import { oaApprovalTypeSchema } from '../events/domain-events.js';
import { entityCodeSchema } from '../org/entities.js';
import {
  workflowDefinitionViewSchema,
  workflowStepDefinitionSchema,
} from './workflow-definition.js';
import {
  slaStateSchema,
  workflowInstanceStatusSchema,
  workflowTaskStatusSchema,
} from './workflow-status.js';
import { workflowTimelineItemSchema } from './workflow-timeline.js';

/** A person on a workflow: matched by employee number, shown by name. */
export const workflowPersonSchema = z.object({
  employeeNo: employeeNoSchema,
  name: z.string(),
});

export type WorkflowPerson = z.infer<typeof workflowPersonSchema>;

/** The approved request that started an instance. */
export const workflowSourceSchema = z.object({
  /** Connector id of the system that raised it, e.g. `oa`. */
  connectorId: z.string(),
  requestId: z.string(),
  requestType: oaApprovalTypeSchema,
  approvedAt: z.iso.datetime(),
});

export type WorkflowSource = z.infer<typeof workflowSourceSchema>;

/** The step waiting for someone. */
export const workflowNextActionSchema = z.object({
  stepKey: z.string(),
  title: z.string(),
  titleZh: z.string(),
  assigneeRole: roleSchema,
  dueAt: z.iso.datetime().nullable(),
});

export type WorkflowNextAction = z.infer<typeof workflowNextActionSchema>;

/** A card on the board or a row of the instance list. */
export const workflowInstanceSummarySchema = z.object({
  id: z.string(),
  definitionKey: z.string(),
  /** The request's title in OA, in the language it was raised in. */
  title: z.string(),
  entityCode: entityCodeSchema,
  status: workflowInstanceStatusSchema,
  currentStepKey: z.string().nullable(),
  source: workflowSourceSchema,
  /** The hiring manager who raised the request. */
  requestedBy: workflowPersonSchema,
  headcount: z.number().int().min(1),
  /** The start date the request asked for. */
  expectedStartDate: z.iso.date().nullable(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  stepsDone: z.number().int().min(0),
  stepsTotal: z.number().int().min(1),
  sla: slaStateSchema,
  nextAction: workflowNextActionSchema.nullable(),
});

export type WorkflowInstanceSummary = z.infer<typeof workflowInstanceSummarySchema>;

/** One step of an instance: its definition, plus its task once the step has started. */
export const workflowInstanceStepSchema = workflowStepDefinitionSchema.extend({
  taskId: z.string().nullable(),
  /** Null until the step's task exists. */
  status: workflowTaskStatusSchema.nullable(),
  dueAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  completedBy: workflowPersonSchema.nullable(),
});

export type WorkflowInstanceStep = z.infer<typeof workflowInstanceStepSchema>;

export const APPROVAL_ACTIONS = ['SUBMIT', 'APPROVE', 'REJECT'] as const;

/** One decision in the OA approval chain, so the approval steps are shown explicitly. */
export const approvalDecisionSchema = z.object({
  /** The OA node name, e.g. 部门负责人审批. */
  node: z.string(),
  approverName: z.string(),
  action: z.enum(APPROVAL_ACTIONS),
  at: z.iso.datetime(),
  comment: z.string().nullable(),
});

export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

/**
 * The employee record the instance created: a draft (`PRE_HIRE`) until area 1
 * activates it from the verified SG HR record (story B-6).
 */
export const workflowDraftRecordSchema = z.object({
  employeeNo: employeeNoSchema,
  status: employmentStatusSchema,
});

export type WorkflowDraftRecord = z.infer<typeof workflowDraftRecordSchema>;

export const workflowInstanceDetailSchema = workflowInstanceSummarySchema.extend({
  definition: workflowDefinitionViewSchema.omit({ steps: true }),
  steps: z.array(workflowInstanceStepSchema),
  approvalChain: z.array(approvalDecisionSchema),
  draftRecord: workflowDraftRecordSchema.nullable(),
  /** Oldest first. */
  timeline: z.array(workflowTimelineItemSchema),
});

export type WorkflowInstanceDetail = z.infer<typeof workflowInstanceDetailSchema>;

export const workflowInstanceListQuerySchema = paginationQuerySchema.extend({
  /** Matches the title or the OA request id. */
  q: z.string().trim().max(100).optional(),
  status: workflowInstanceStatusSchema.optional(),
  stepKey: z.string().trim().max(64).optional(),
  entityCode: entityCodeSchema.optional(),
});

export type WorkflowInstanceListQuery = z.infer<typeof workflowInstanceListQuerySchema>;
