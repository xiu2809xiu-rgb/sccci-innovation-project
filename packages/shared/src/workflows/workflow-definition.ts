import { z } from 'zod';

import { roleSchema } from '../auth/roles.js';

/** One step of a workflow definition (seeded in `apps/api/prisma/seed/workflows.ts`). */
export const workflowStepDefinitionSchema = z.object({
  key: z.string(),
  title: z.string(),
  titleZh: z.string(),
  assigneeRole: roleSchema,
  /** Time allowed for the step; area 2's SLA rules decide when the clock starts. */
  slaHours: z.number().int().min(1),
});

export type WorkflowStepDefinition = z.infer<typeof workflowStepDefinitionSchema>;

/** A versioned workflow definition. An instance keeps the version it started on. */
export const workflowDefinitionViewSchema = z.object({
  key: z.string(),
  version: z.number().int().min(1),
  name: z.string(),
  nameZh: z.string(),
  steps: z.array(workflowStepDefinitionSchema).min(1),
});

export type WorkflowDefinitionView = z.infer<typeof workflowDefinitionViewSchema>;
