import { describe, expect, it } from 'vitest';

import { workflowStepDefinitionSchema } from './workflow-definition.js';
import { rejectWorkflowTaskSchema } from './workflow-task.js';
import { workflowTimelineItemSchema, workflowTimelineTypeSchema } from './workflow-timeline.js';

/** The contracts a rejected workflow step travels through (OP-WF-04, area 2). */
describe('Workflow rejection contracts', () => {
  const step = {
    key: 'approve',
    title: 'Approve',
    titleZh: '审批',
    assigneeRole: 'HR_SG',
    slaHours: 8,
  };

  it('lets a step name the earlier step its rejections return to, and keeps steps without one valid', () => {
    expect(
      workflowStepDefinitionSchema.parse({ ...step, onReject: { returnTo: 'prepare' } }),
    ).toMatchObject({
      onReject: { returnTo: 'prepare' },
    });
    expect(workflowStepDefinitionSchema.parse(step).onReject).toBeUndefined();
  });

  it('requires a reason to reject a task, trimmed and at most 500 characters', () => {
    expect(rejectWorkflowTaskSchema.parse({ reason: '  Wrong quantity  ' })).toEqual({
      reason: 'Wrong quantity',
    });
    expect(rejectWorkflowTaskSchema.safeParse({ reason: '   ' }).success).toBe(false);
    expect(rejectWorkflowTaskSchema.safeParse({}).success).toBe(false);
    expect(rejectWorkflowTaskSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });

  it('records a rejection on the timeline with its reason, and keeps items without a reason valid', () => {
    const item = {
      id: 'evt-1',
      type: 'task.rejected',
      occurredAt: '2026-11-03T01:30:00.000Z',
      stepKey: 'approve',
      actor: null,
      channel: null,
    };

    expect(workflowTimelineTypeSchema.parse('task.rejected')).toBe('task.rejected');
    expect(workflowTimelineItemSchema.parse({ ...item, reason: 'Wrong quantity' }).reason).toBe(
      'Wrong quantity',
    );
    expect(workflowTimelineItemSchema.parse(item).reason).toBeUndefined();
  });
});
