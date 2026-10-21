import { z } from 'zod';

import { entityCodeSchema } from '../org/entities.js';
import {
  workflowDefinitionViewSchema,
  workflowStepDefinitionSchema,
} from './workflow-definition.js';
import { workflowInstanceSummarySchema } from './workflow-instance.js';

/** Most cards a board column returns; `total` still counts every instance in the column. */
export const WORKFLOW_BOARD_COLUMN_LIMIT = 20;

/** Instances whose current step is this column's step, the most urgent first. */
export const workflowBoardColumnSchema = z.object({
  step: workflowStepDefinitionSchema,
  total: z.number().int().min(0),
  instances: z.array(workflowInstanceSummarySchema).max(WORKFLOW_BOARD_COLUMN_LIMIT),
});

export type WorkflowBoardColumn = z.infer<typeof workflowBoardColumnSchema>;

/** The pipeline board: one column per step of the active definition. */
export const workflowBoardSchema = z.object({
  definition: workflowDefinitionViewSchema.omit({ steps: true }),
  columns: z.array(workflowBoardColumnSchema),
  /** Completed in the last 30 days, newest first. */
  recentlyCompleted: z.array(workflowInstanceSummarySchema).max(WORKFLOW_BOARD_COLUMN_LIMIT),
});

export type WorkflowBoard = z.infer<typeof workflowBoardSchema>;

export const workflowBoardQuerySchema = z.object({
  /** Matches the title or the OA request id. */
  q: z.string().trim().max(100).optional(),
  entityCode: entityCodeSchema.optional(),
});

export type WorkflowBoardQuery = z.infer<typeof workflowBoardQuerySchema>;
