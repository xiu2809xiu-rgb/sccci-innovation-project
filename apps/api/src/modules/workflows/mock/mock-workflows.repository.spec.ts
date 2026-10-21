import {
  MANPOWER_TO_ONBOARDING,
  workflowBoardSchema,
  workflowInstanceDetailSchema,
  workflowTaskViewSchema,
} from '@huitong/shared';

import { MockWorkflowsRepository } from './mock-workflows.repository.js';
import { MOCK_WORKFLOW_INSTANCES } from './workflow-mock-data.js';

const repository = new MockWorkflowsRepository();
const page = { page: 1, pageSize: 25 };
const stepKeys = MANPOWER_TO_ONBOARDING.steps.map((step) => step.key);

describe('MockWorkflowsRepository', () => {
  it('serves every sample instance in the shared contract', async () => {
    for (const { id } of MOCK_WORKFLOW_INSTANCES) {
      workflowInstanceDetailSchema.parse(await repository.instance(id));
    }
    workflowBoardSchema.parse(await repository.board({}));
    const tasks = await repository.tasks({ ...page, state: 'all' });
    expect(tasks.items.length).toBeGreaterThan(0);
    for (const task of tasks.items) workflowTaskViewSchema.parse(task);
  });

  it('only names steps of the seeded definition, so the sample cannot drift from it', () => {
    for (const instance of MOCK_WORKFLOW_INSTANCES) {
      expect(stepKeys).toEqual(expect.arrayContaining(Object.keys(instance.steps)));
      for (const item of instance.timeline) {
        if (item.stepKey !== null) expect(stepKeys).toContain(item.stepKey);
      }
    }
  });

  it('puts each running instance in its current step, the most urgent first', async () => {
    const board = await repository.board({});
    expect(board.columns.map((column) => column.step.key)).toEqual(stepKeys);
    const recruit = board.columns.find((column) => column.step.key === 'recruit');
    expect(recruit?.instances.map((item) => item.source.requestId)).toEqual([
      'OA-2026-000101',
      'OA-2026-000103',
    ]);
    expect(recruit?.instances.map((item) => item.sla)).toEqual(['OVERDUE', 'ON_TRACK']);
    const placed = board.columns.reduce((sum, column) => sum + column.total, 0);
    expect(placed).toBe(MOCK_WORKFLOW_INSTANCES.length);
  });

  it('derives the progress and next action from the steps', async () => {
    const technology = await repository.instance('0198d6e2-1b40-7f63-9d15-6a2e4c8b7f02');
    expect(technology).toMatchObject({
      currentStepKey: 'desk',
      stepsDone: 5,
      stepsTotal: 8,
      sla: 'DUE_SOON',
      nextAction: { stepKey: 'desk', assigneeRole: 'ADMIN_OPS' },
      draftRecord: { status: 'PRE_HIRE' },
    });
  });

  it('searches the board and the list by title or OA request id', async () => {
    const board = await repository.board({ q: 'oa-2026-000102' });
    expect(board.columns.flatMap((column) => column.instances).map((item) => item.title)).toEqual([
      'Technology: 1 x Software Engineer',
    ]);
    const list = await repository.instances({ ...page, q: 'compliance' });
    expect(list.total).toBe(1);
    expect((await repository.instances({ ...page, entityCode: 'CN01' })).total).toBe(0);
  });

  it('pages the instance list, newest first', async () => {
    const first = await repository.instances({ page: 1, pageSize: 2 });
    const second = await repository.instances({ page: 2, pageSize: 2 });
    expect(first.total).toBe(MOCK_WORKFLOW_INSTANCES.length);
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(MOCK_WORKFLOW_INSTANCES.length - 2);
    const started = [...first.items, ...second.items].map((item) => item.startedAt);
    expect(started).toEqual([...started].sort().reverse());
  });

  it('filters tasks by role, state and SLA, open work first', async () => {
    const adminOps = await repository.tasks({ ...page, state: 'open', assigneeRole: 'ADMIN_OPS' });
    expect(adminOps.items.map((task) => [task.stepKey, task.sla])).toEqual([['desk', 'DUE_SOON']]);

    const done = await repository.tasks({ ...page, state: 'done', assigneeRole: 'ADMIN_OPS' });
    expect(done.items.map((task) => task.stepKey)).toEqual(['laptop']);

    const overdue = await repository.tasks({ ...page, state: 'open', sla: 'OVERDUE' });
    expect(overdue.items.map((task) => task.instanceTitle)).toEqual([
      'Wealth Management: 2 x Relationship Manager',
    ]);

    const all = await repository.tasks({ ...page, state: 'all' });
    const firstDone = all.items.findIndex((task) => task.status === 'DONE');
    expect(all.items.slice(firstDone).every((task) => task.status === 'DONE')).toBe(true);
  });

  it('returns null for an unknown instance', async () => {
    expect(await repository.instance('no-such-instance')).toBeNull();
  });
});
