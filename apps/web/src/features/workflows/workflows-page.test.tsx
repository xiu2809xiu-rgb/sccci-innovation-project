import {
  DEFAULT_ROLE_PERMISSIONS,
  MANPOWER_TO_ONBOARDING,
  type Role,
  type WorkflowBoard,
  type WorkflowInstanceDetail,
  type WorkflowInstanceSummary,
  type WorkflowTaskView,
} from '@huitong/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const { steps: STEPS, ...DEFINITION } = MANPOWER_TO_ONBOARDING;
const SAMPLE = { mock: true } as const;

const WEALTH: WorkflowInstanceSummary = {
  id: 'wealth',
  definitionKey: DEFINITION.key,
  title: 'Wealth Management: 2 x Relationship Manager',
  entityCode: 'SG01',
  status: 'RUNNING',
  currentStepKey: 'recruit',
  source: {
    connectorId: 'oa',
    requestId: 'OA-2026-000101',
    requestType: 'MANPOWER_REQUEST',
    approvedAt: '2026-09-05T03:22:00Z',
  },
  requestedBy: { employeeNo: 'E100006', name: 'Arjun Menon' },
  headcount: 2,
  expectedStartDate: '2026-12-01',
  startedAt: '2026-09-05T03:22:30Z',
  completedAt: null,
  stepsDone: 1,
  stepsTotal: STEPS.length,
  sla: 'OVERDUE',
  nextAction: {
    stepKey: 'recruit',
    title: 'Recruit and select a candidate',
    titleZh: '招聘与甄选',
    assigneeRole: 'HIRING_MANAGER',
    dueAt: '2026-10-05T08:10:00Z',
  },
};

const TECHNOLOGY: WorkflowInstanceSummary = {
  ...WEALTH,
  id: 'technology',
  title: 'Technology: 1 x Software Engineer',
  currentStepKey: 'desk',
  source: { ...WEALTH.source, requestId: 'OA-2026-000102', approvedAt: '2026-08-23T08:36:00Z' },
  requestedBy: { employeeNo: 'E100026', name: 'Yeo Cheng Ze' },
  headcount: 1,
  expectedStartDate: '2026-11-16',
  stepsDone: 5,
  sla: 'DUE_SOON',
  nextAction: {
    stepKey: 'desk',
    title: 'Assign a desk and access card',
    titleZh: '安排工位与门禁卡',
    assigneeRole: 'ADMIN_OPS',
    dueAt: '2026-10-22T02:15:00Z',
  },
};

function boardWith(instances: readonly WorkflowInstanceSummary[]): WorkflowBoard {
  return {
    definition: DEFINITION,
    columns: STEPS.map((step) => {
      const inColumn = instances.filter((instance) => instance.currentStepKey === step.key);
      return { step, total: inColumn.length, instances: inColumn };
    }),
    recentlyCompleted: [],
  };
}

const TECHNOLOGY_DETAIL: WorkflowInstanceDetail = {
  ...TECHNOLOGY,
  definition: DEFINITION,
  steps: STEPS.map((step, index) => ({
    ...step,
    taskId: index <= 5 ? `task-${String(index + 1)}` : null,
    status: index < 5 ? 'DONE' : index === 5 ? 'IN_PROGRESS' : null,
    dueAt: index <= 5 ? '2026-10-22T02:15:00Z' : null,
    completedAt: index < 5 ? '2026-10-19T02:15:00Z' : null,
    completedBy: index < 5 ? { employeeNo: 'E100003', name: 'Tan Mei Ling' } : null,
  })),
  approvalChain: [
    {
      node: '发起申请',
      approverName: 'Yeo Cheng Ze',
      action: 'SUBMIT',
      at: '2026-08-18T03:00:00Z',
      comment: null,
    },
    {
      node: '总部审批',
      approverName: '周欣怡',
      action: 'APPROVE',
      at: '2026-08-23T08:36:00Z',
      comment: '同意',
    },
  ],
  draftRecord: { employeeNo: 'E100121', status: 'PRE_HIRE' },
  timeline: [
    {
      id: 'e1',
      type: 'instance.started',
      occurredAt: '2026-08-23T08:36:30Z',
      stepKey: null,
      actor: null,
      channel: null,
    },
    {
      id: 'e2',
      type: 'notification.sent',
      occurredAt: '2026-10-19T02:15:01Z',
      stepKey: 'desk',
      actor: null,
      channel: 'TEAMS',
    },
  ],
};

const DESK_TASK: WorkflowTaskView = {
  id: 'task-6',
  instanceId: 'technology',
  instanceTitle: TECHNOLOGY.title,
  entityCode: 'SG01',
  stepKey: 'desk',
  title: 'Assign a desk and access card',
  titleZh: '安排工位与门禁卡',
  assigneeRole: 'ADMIN_OPS',
  assignee: { employeeNo: 'E100007', name: 'Nur Aisyah' },
  status: 'IN_PROGRESS',
  dueAt: '2026-10-22T02:15:00Z',
  completedAt: null,
  sla: 'DUE_SOON',
};

function routesFor(role: Role, extra: FakeRoutes = {}): FakeRoutes {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
    'GET /workflows/board': { body: { data: boardWith([WEALTH, TECHNOLOGY]), meta: SAMPLE } },
    'GET /workflows/instances/technology': { body: { data: TECHNOLOGY_DETAIL, meta: SAMPLE } },
    'GET /workflows/tasks': {
      body: { data: [DESK_TASK], meta: { page: 1, pageSize: 25, total: 1, ...SAMPLE } },
    },
    ...extra,
  };
}

describe('Workflow board', () => {
  it('shows each request in its current step, labelled as sample data', async () => {
    renderApp('/workflows', routesFor('HR_SG'));
    const board = await screen.findByRole('region', {
      name: 'Pipeline board, one column per step',
    });
    const recruit = within(board).getByRole('region', { name: 'Recruit and select a candidate' });
    expect(within(recruit).getByRole('link', { name: WEALTH.title })).toBeInTheDocument();
    expect(within(recruit).getByText('Overdue')).toBeInTheDocument();
    const desk = within(board).getByRole('region', { name: 'Assign a desk and access card' });
    expect(within(desk).getByText('Next: Assign a desk and access card')).toBeInTheDocument();
    expect(within(board).getAllByText('Nothing at this step')).toHaveLength(STEPS.length - 2);
    expect(screen.getByRole('button', { name: 'Sample data' })).toBeInTheDocument();
  });

  it('drops the sample label once the API serves real data', async () => {
    renderApp(
      '/workflows',
      routesFor('HR_SG', { 'GET /workflows/board': { body: { data: boardWith([WEALTH]) } } }),
    );
    await screen.findByRole('link', { name: WEALTH.title });
    expect(screen.queryByRole('button', { name: 'Sample data' })).not.toBeInTheDocument();
  });

  it('lays the requests out on a timeline, in words as well as bars', async () => {
    renderApp('/workflows?view=timeline', routesFor('HR_SG'));
    const timeline = await screen.findByRole('list', {
      name: 'Workflows on a timeline, from OA approval to the requested day one',
    });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(within(timeline).getByText(/step 5 of 8/)).toBeInTheDocument();
  });

  it('offers a way out of an empty search', async () => {
    const user = userEvent.setup();
    renderApp(
      '/workflows?q=nobody',
      routesFor('HR_SG', { 'GET /workflows/board': { body: { data: boardWith([]) } } }),
    );
    expect(await screen.findByText('No workflow matches your search.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: 'Search workflows' })).toHaveValue('');
    });
  });

  it('shows the error with its trace id and a retry', async () => {
    renderApp(
      '/workflows',
      routesFor('HR_SG', {
        'GET /workflows/board': {
          status: 500,
          body: { error: { code: 'INTERNAL', message: 'boom', traceId: 'trace-42' } },
        },
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('trace-42');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('reads the steps in Chinese', async () => {
    renderApp('/workflows', routesFor('HR_SG'), 'zh-CN');
    expect(await screen.findByRole('region', { name: '招聘与甄选' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '示例数据' })).toBeInTheDocument();
  });
});

describe('Workflow instance', () => {
  it('shows the steps, the OA approval chain, the draft record and the history', async () => {
    renderApp('/workflows/technology', routesFor('HR_SG'));
    expect(await screen.findByRole('heading', { level: 1, name: TECHNOLOGY.title })).toBeVisible();
    const steps = screen.getByRole('region', { name: 'Steps' });
    expect(within(steps).getAllByText(/Done by Tan Mei Ling/)).toHaveLength(5);
    const approval = screen.getByRole('region', { name: 'Approval in OA' });
    expect(within(approval).getByText(/周欣怡/)).toBeInTheDocument();
    const record = screen.getByRole('region', { name: 'Employee record' });
    expect(within(record).getByText('Draft record E100121')).toBeInTheDocument();
    expect(within(record).getByText('Joining soon')).toBeInTheDocument();
    const history = screen.getByRole('region', { name: 'History' });
    expect(within(history).getByText('Message sent through Teams (mock)')).toBeInTheDocument();
  });

  it('says when the workflow does not exist', async () => {
    renderApp('/workflows/missing', routesFor('HR_SG'));
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'All workflows' }).length).toBeGreaterThan(0);
  });
});

describe('Workflow tasks', () => {
  it("lists the caller's role's tasks and explains why marking one done waits", async () => {
    renderApp('/workflows/tasks', routesFor('ADMIN_OPS'));
    const table = await screen.findByRole('table', { name: 'Workflow tasks' });
    expect(
      await within(table).findByRole('link', { name: 'Assign a desk and access card' }),
    ).toBeVisible();
    const markDone = within(table).getByRole('button', {
      name: 'Mark done: Assign a desk and access card',
    });
    expect(markDone).toHaveAttribute('aria-disabled', 'true');
    // Only managers of workflows may switch to every role's tasks.
    expect(screen.queryByRole('group', { name: 'Whose tasks' })).not.toBeInTheDocument();
  });

  it('reports a task the server could not complete', async () => {
    const user = userEvent.setup();
    renderApp(
      '/workflows/tasks',
      routesFor('ADMIN_OPS', {
        'GET /workflows/tasks': {
          body: { data: [DESK_TASK], meta: { page: 1, pageSize: 25, total: 1 } },
        },
        'POST /workflows/tasks/task-6/complete': {
          status: 501,
          body: { error: { code: 'NOT_IMPLEMENTED', message: 'not yet', traceId: 'trace-7' } },
        },
      }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Mark done: Assign a desk and access card' }),
    );
    expect(
      await screen.findByText('This part of HuiTong is not built yet. Nothing was changed.'),
    ).toBeInTheDocument();
  });

  it('offers every role’s tasks when the caller manages workflows and has none', async () => {
    const user = userEvent.setup();
    renderApp(
      '/workflows/tasks',
      routesFor('HR_SG', {
        'GET /workflows/tasks': {
          body: { data: [], meta: { page: 1, pageSize: 25, total: 0, ...SAMPLE } },
        },
      }),
    );
    await user.click(await screen.findByRole('button', { name: "See every role's tasks" }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Every role' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  });

  it('is refused to roles without workflows:tasks', async () => {
    renderApp('/workflows/tasks', routesFor('MANAGEMENT'));
    expect(await screen.findByText('You do not have access to this page')).toBeVisible();
  });
});
