import type { WorkflowDefinitionView } from '@huitong/shared';

import { ConflictError } from '../../common/errors/app-error.js';
import {
  canTransition,
  WorkflowStateMachine,
  type WorkflowInstanceSnapshot,
} from './workflow-state-machine.js';

/**
 * Area 2's workflow state machine (stories C-2 and C-6). The module's line
 * coverage must reach 80% (docs/team/module-ownership.md). The audit, publish
 * and activation cases belong to the service that saves the state machine's
 * results, so they stay to-dos until it exists.
 */
const DEFINITION: WorkflowDefinitionView = {
  key: 'test-onboarding',
  version: 2,
  name: 'Test onboarding',
  nameZh: '测试入职',
  steps: [
    {
      key: 'entry',
      title: 'New-hire entry',
      titleZh: '新员工录入',
      assigneeRole: 'HR_SG',
      slaHours: 24,
    },
    {
      key: 'laptop',
      title: 'Laptop',
      titleZh: '笔记本电脑',
      assigneeRole: 'ADMIN_OPS',
      slaHours: 72,
    },
    { key: 'welcome', title: 'Welcome', titleZh: '入职欢迎', assigneeRole: 'HR_SG', slaHours: 8 },
  ],
};

const T0 = new Date('2026-11-02T01:00:00.000Z');
const T1 = new Date('2026-11-02T05:00:00.000Z');
const T2 = new Date('2026-11-03T09:30:00.000Z');
const T3 = new Date('2026-11-04T02:00:00.000Z');

const machine = new WorkflowStateMachine(DEFINITION);

function started(): WorkflowInstanceSnapshot {
  return machine.start(T0).state;
}

/** An instance at the laptop step, with the entry step done. */
function atLaptop(): WorkflowInstanceSnapshot {
  return machine.completeTask(started(), 'entry', 'user-hr', T1).state;
}

function completedAll(): WorkflowInstanceSnapshot {
  const state = machine.completeTask(atLaptop(), 'laptop', 'user-ops', T2).state;
  return machine.completeTask(state, 'welcome', 'user-hr', T3).state;
}

/** Freezes every object in a state, so any change to it throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('WorkflowStateMachine (C-2, area 2)', () => {
  it('starts an instance at the first step of the definition version it was created with', () => {
    const { state, transitions } = machine.start(T0);

    expect(state).toMatchObject({
      definitionKey: 'test-onboarding',
      definitionVersion: 2,
      status: 'RUNNING',
      currentStepKey: 'entry',
      completedAt: null,
    });
    expect(transitions).toEqual([
      { type: 'instance.started', stepKey: null, at: T0, reason: null },
      { type: 'task.created', stepKey: 'entry', at: T0, reason: null },
    ]);
  });

  it('refuses a definition with no steps', () => {
    const empty = new WorkflowStateMachine({ ...DEFINITION, steps: [] });

    expect(() => empty.start(T0)).toThrow(ConflictError);
  });

  it('refuses a definition that repeats a step key', () => {
    const [entry, laptop] = DEFINITION.steps;

    expect(
      () => new WorkflowStateMachine({ ...DEFINITION, steps: [entry!, laptop!, entry!] }),
    ).toThrow(ConflictError);
  });

  it('creates the task for a step with its assignee role and its due time', () => {
    const [task] = started().tasks;

    expect(task).toEqual({
      stepKey: 'entry',
      assigneeRole: 'HR_SG',
      status: 'PENDING',
      dueAt: new Date('2026-11-03T01:00:00.000Z'),
      completedAt: null,
      completedBy: null,
      blockedReason: null,
      outcome: null,
      rejectionReason: null,
    });
  });

  it('moves to the next step when the current task is completed', () => {
    const { state, transitions } = machine.completeTask(started(), 'entry', 'user-hr', T1);

    expect(state.status).toBe('RUNNING');
    expect(state.currentStepKey).toBe('laptop');
    expect(state.tasks[0]).toMatchObject({
      status: 'DONE',
      completedAt: T1,
      completedBy: 'user-hr',
    });
    expect(state.tasks[1]).toMatchObject({
      stepKey: 'laptop',
      assigneeRole: 'ADMIN_OPS',
      status: 'PENDING',
      dueAt: new Date('2026-11-05T05:00:00.000Z'),
    });
    expect(transitions).toEqual([
      { type: 'task.completed', stepKey: 'entry', at: T1, reason: null },
      { type: 'task.created', stepKey: 'laptop', at: T1, reason: null },
    ]);
  });

  it('never changes the state it is given', () => {
    const running = deepFreeze(atLaptop());
    const waiting = deepFreeze(machine.pause(atLaptop(), T2).state);

    expect(() => {
      machine.completeTask(running, 'laptop', 'user-ops', T2);
      machine.pause(running, T2);
      machine.resume(waiting, T2);
      machine.fail(running, 'laptop', T2, 'retries exhausted');
      machine.cancel(running, T2);
      machine.cancel(
        deepFreeze({ ...atLaptop(), tasks: [{ ...atLaptop().tasks[1]!, status: 'IN_PROGRESS' }] }),
        T2,
      );
    }).not.toThrow();
  });

  it('refuses to complete a task that is not the current step (409 CONFLICT)', () => {
    const state = started();

    expect(() => machine.completeTask(state, 'laptop', 'user-ops', T1)).toThrow(ConflictError);
    expect(() => machine.completeTask(state, 'no-such-step', 'user-ops', T1)).toThrow(
      expect.objectContaining({ status: 409, code: 'CONFLICT' }),
    );
  });

  it('refuses to complete a blocked task until it is unblocked', () => {
    const state = started();
    const blocked: WorkflowInstanceSnapshot = {
      ...state,
      tasks: [{ ...state.tasks[0]!, status: 'BLOCKED' }],
    };

    expect(() => machine.completeTask(blocked, 'entry', 'user-hr', T1)).toThrow(ConflictError);
  });

  it('refuses any transition out of COMPLETED, FAILED or CANCELLED (409 CONFLICT)', () => {
    const finals = [
      completedAll(),
      machine.fail(started(), 'entry', T1).state,
      machine.cancel(started(), T1).state,
    ];

    for (const state of finals) {
      const step = state.currentStepKey ?? 'entry';
      expect(() => machine.completeTask(state, step, 'user-hr', T2)).toThrow(ConflictError);
      expect(() => machine.pause(state, T2)).toThrow(ConflictError);
      expect(() => machine.resume(state, T2)).toThrow(ConflictError);
      expect(() => machine.fail(state, step, T2)).toThrow(ConflictError);
      expect(() => machine.cancel(state, T2)).toThrow(ConflictError);
    }
  });

  it('pauses as WAITING and resumes as RUNNING without losing the current step', () => {
    const running = atLaptop();

    const paused = machine.pause(running, T2, 'Waiting for the SAP record');
    expect(paused.state).toMatchObject({ status: 'WAITING', currentStepKey: 'laptop' });
    expect(paused.transitions).toEqual([
      { type: 'instance.paused', stepKey: 'laptop', at: T2, reason: 'Waiting for the SAP record' },
    ]);

    const resumed = machine.resume(paused.state, T3);
    expect(resumed.state).toMatchObject({ status: 'RUNNING', currentStepKey: 'laptop' });
    expect(resumed.state.tasks).toEqual(running.tasks);
    expect(resumed.transitions).toEqual([
      { type: 'instance.resumed', stepKey: 'laptop', at: T3, reason: null },
    ]);
  });

  it('refuses to complete a task while WAITING, to pause twice or to resume a running instance', () => {
    const waiting = machine.pause(started(), T1).state;

    expect(() => machine.completeTask(waiting, 'entry', 'user-hr', T2)).toThrow(ConflictError);
    expect(() => machine.pause(waiting, T2)).toThrow(ConflictError);
    expect(() => machine.resume(started(), T2)).toThrow(ConflictError);
  });

  it('completes the instance after the last step', () => {
    const state = completedAll();

    expect(state).toMatchObject({ status: 'COMPLETED', currentStepKey: null, completedAt: T3 });
    expect(state.tasks.map((t) => t.status)).toEqual(['DONE', 'DONE', 'DONE']);
  });

  it('cancels the open tasks when the instance is cancelled', () => {
    const { state, transitions } = machine.cancel(atLaptop(), T2, 'Approval cancelled');

    expect(state.status).toBe('CANCELLED');
    expect(state.tasks.map((t) => t.status)).toEqual(['DONE', 'SKIPPED']);
    expect(transitions).toEqual([
      { type: 'task.skipped', stepKey: 'laptop', at: T2, reason: 'Approval cancelled' },
      { type: 'instance.cancelled', stepKey: 'laptop', at: T2, reason: 'Approval cancelled' },
    ]);
  });

  it('flags a task someone had picked up when the approval is cancelled, so they can undo the work', () => {
    const state = atLaptop();
    const pickedUp: WorkflowInstanceSnapshot = {
      ...state,
      tasks: [state.tasks[0]!, { ...state.tasks[1]!, status: 'IN_PROGRESS' }],
    };

    const { state: cancelled, transitions } = machine.cancel(pickedUp, T2, 'Approval cancelled');

    expect(cancelled.tasks[1]).toMatchObject({
      status: 'BLOCKED',
      blockedReason: 'Approval cancelled',
    });
    expect(transitions.map((t) => [t.type, t.stepKey])).toEqual([
      ['task.blocked', 'laptop'],
      ['instance.cancelled', 'laptop'],
    ]);
  });

  it('cancels a WAITING instance and skips its untouched task', () => {
    const waiting = machine.pause(started(), T1).state;

    const { state, transitions } = machine.cancel(waiting, T2);

    expect(state.status).toBe('CANCELLED');
    expect(state.tasks.map((t) => t.status)).toEqual(['SKIPPED']);
    expect(transitions.map((t) => [t.type, t.stepKey])).toEqual([
      ['task.skipped', 'entry'],
      ['instance.cancelled', 'entry'],
    ]);
  });

  it('fails the instance and blocks the current task with the reason, so a person can see where it stopped', () => {
    const { state, transitions } = machine.fail(atLaptop(), 'laptop', T2, 'Retries exhausted');

    expect(state).toMatchObject({ status: 'FAILED', currentStepKey: 'laptop' });
    expect(state.tasks.map((t) => t.status)).toEqual(['DONE', 'BLOCKED']);
    expect(state.tasks[1]!.blockedReason).toBe('Retries exhausted');
    expect(transitions).toEqual([
      { type: 'task.blocked', stepKey: 'laptop', at: T2, reason: 'Retries exhausted' },
      { type: 'instance.failed', stepKey: 'laptop', at: T2, reason: 'Retries exhausted' },
    ]);
  });

  it('fails a WAITING instance too', () => {
    const waiting = machine.pause(started(), T1).state;

    const { state } = machine.fail(waiting, 'entry', T2);

    expect(state.status).toBe('FAILED');
    expect(state.tasks.map((t) => t.status)).toEqual(['BLOCKED']);
  });

  it('refuses a failure for a step that is no longer current, so a stale job cannot fail a later step', () => {
    expect(() => machine.fail(atLaptop(), 'entry', T2, 'Retries exhausted')).toThrow(ConflictError);
  });

  it('refuses to run an instance on another definition version', () => {
    const v3 = new WorkflowStateMachine({ ...DEFINITION, version: 3 });
    const other = new WorkflowStateMachine({ ...DEFINITION, key: 'claims' });

    expect(() => v3.completeTask(started(), 'entry', 'user-hr', T1)).toThrow(ConflictError);
    expect(() => other.cancel(started(), T1)).toThrow(ConflictError);
  });

  it('allows only the transitions in its table', () => {
    expect(canTransition('RUNNING', 'WAITING')).toBe(true);
    expect(canTransition('WAITING', 'RUNNING')).toBe(true);
    expect(canTransition('WAITING', 'COMPLETED')).toBe(false);
    expect(canTransition('COMPLETED', 'RUNNING')).toBe(false);
    expect(canTransition('CANCELLED', 'RUNNING')).toBe(false);
  });

  it.todo('writes an audit event for every transition, with the actor and the trace id');
  it.todo('publishes the lifecycle events only after the transaction commits');
  it.todo('never makes the employee record active: activation is area 1’s rule (B-6)');
});

/**
 * Rejecting a step and returning the work for correction (OP-WF-04). The
 * approval step names the earlier step its rejections return to.
 */
const APPROVAL: WorkflowDefinitionView = {
  key: 'test-approval',
  version: 1,
  name: 'Test approval',
  nameZh: '测试审批',
  steps: [
    { key: 'prepare', title: 'Prepare', titleZh: '准备', assigneeRole: 'HR_SG', slaHours: 24 },
    { key: 'check', title: 'Check', titleZh: '核对', assigneeRole: 'HR_SG', slaHours: 4 },
    {
      key: 'approve',
      title: 'Approve',
      titleZh: '审批',
      assigneeRole: 'HIRING_MANAGER',
      slaHours: 8,
      onReject: { returnTo: 'prepare' },
    },
    { key: 'notify', title: 'Notify', titleZh: '通知', assigneeRole: 'HR_SG', slaHours: 2 },
  ],
};

const approvals = new WorkflowStateMachine(APPROVAL);

/** An instance waiting at the approval step. */
function atApproval(): WorkflowInstanceSnapshot {
  let state = approvals.start(T0).state;
  state = approvals.completeTask(state, 'prepare', 'user-hr', T0).state;
  return approvals.completeTask(state, 'check', 'user-hr', T1).state;
}

describe('Rejecting a step (OP-WF-04, area 2)', () => {
  it('closes the task as rejected and reopens the step it returns to, with a new due time', () => {
    const { state, transitions } = approvals.reject(
      atApproval(),
      'approve',
      'user-approver',
      T2,
      'Unit price differs from the price list',
    );

    expect(state).toMatchObject({ status: 'RUNNING', currentStepKey: 'prepare' });
    expect(state.tasks.map((t) => [t.stepKey, t.status, t.outcome])).toEqual([
      ['prepare', 'DONE', 'COMPLETED'],
      ['check', 'DONE', 'COMPLETED'],
      ['approve', 'DONE', 'REJECTED'],
      ['prepare', 'PENDING', null],
    ]);
    expect(state.tasks[2]).toMatchObject({
      completedAt: T2,
      completedBy: 'user-approver',
      rejectionReason: 'Unit price differs from the price list',
    });
    expect(state.tasks[3]!.dueAt).toEqual(new Date('2026-11-04T09:30:00.000Z'));
    expect(transitions).toEqual([
      {
        type: 'task.rejected',
        stepKey: 'approve',
        at: T2,
        reason: 'Unit price differs from the price list',
      },
      { type: 'task.created', stepKey: 'prepare', at: T2, reason: null },
    ]);
  });

  it('runs the returned work forward again, through the steps between, to a new approval', () => {
    const state = approvals.reject(
      atApproval(),
      'approve',
      'user-approver',
      T2,
      'Wrong quantity',
    ).state;
    const prepared = approvals.completeTask(state, 'prepare', 'user-hr', T3);
    expect(prepared.state.currentStepKey).toBe('check');
    expect(prepared.transitions.map((t) => [t.type, t.stepKey])).toEqual([
      ['task.completed', 'prepare'],
      ['task.created', 'check'],
    ]);
    const checked = approvals.completeTask(prepared.state, 'check', 'user-hr', T3);
    expect(checked.state.currentStepKey).toBe('approve');
    // The second round's approval gets its own SLA clock, counted from when it started again.
    expect(checked.state.tasks.at(-1)).toMatchObject({
      stepKey: 'approve',
      status: 'PENDING',
      dueAt: new Date('2026-11-04T10:00:00.000Z'),
    });

    const { state: approved } = approvals.completeTask(
      checked.state,
      'approve',
      'user-approver',
      T3,
    );

    expect(approved.currentStepKey).toBe('notify');
    expect(approved.tasks.filter((t) => t.stepKey === 'approve').map((t) => t.outcome)).toEqual([
      'REJECTED',
      'COMPLETED',
    ]);
  });

  it('refuses a rejection on a step that names no step to return to (409 CONFLICT)', () => {
    let state = approvals.start(T0).state;
    state = approvals.completeTask(state, 'prepare', 'user-hr', T0).state;

    expect(() => approvals.reject(state, 'check', 'user-hr', T1, 'Not ready')).toThrow(
      expect.objectContaining({ status: 409, code: 'CONFLICT' }),
    );
  });

  it('refuses a rejection without a reason, so the person who corrects it knows what to fix', () => {
    expect(() => approvals.reject(atApproval(), 'approve', 'user-approver', T2, '')).toThrow(
      ConflictError,
    );
    expect(() => approvals.reject(atApproval(), 'approve', 'user-approver', T2, '   ')).toThrow(
      ConflictError,
    );
  });

  it('refuses a rejection of a step that is not current', () => {
    const state = approvals.completeTask(atApproval(), 'approve', 'user-approver', T2).state;

    expect(() => approvals.reject(state, 'approve', 'user-approver', T3, 'Too late')).toThrow(
      ConflictError,
    );
  });

  it('refuses a rejection while WAITING or after the workflow has completed, failed or been cancelled', () => {
    const waiting = approvals.pause(atApproval(), T2).state;
    const failed = approvals.fail(atApproval(), 'approve', T2).state;
    const cancelled = approvals.cancel(atApproval(), T2).state;
    const approved = approvals.completeTask(atApproval(), 'approve', 'user-approver', T2).state;
    const completed = approvals.completeTask(approved, 'notify', 'user-hr', T2).state;
    expect(completed.status).toBe('COMPLETED');

    for (const state of [waiting, failed, cancelled, completed]) {
      expect(() => approvals.reject(state, 'approve', 'user-approver', T3, 'No')).toThrow(
        ConflictError,
      );
    }
  });

  it('returns to the step the definition names, not simply the first step', () => {
    const toCheck = new WorkflowStateMachine({
      ...APPROVAL,
      steps: APPROVAL.steps.map((s) =>
        s.key === 'approve' ? { ...s, onReject: { returnTo: 'check' } } : s,
      ),
    });
    let state = toCheck.start(T0).state;
    state = toCheck.completeTask(state, 'prepare', 'user-hr', T0).state;
    state = toCheck.completeTask(state, 'check', 'user-hr', T1).state;

    const { state: returned } = toCheck.reject(state, 'approve', 'user-approver', T2, 'Recheck');

    expect(returned.currentStepKey).toBe('check');
    expect(returned.tasks.map((t) => t.stepKey)).toEqual(['prepare', 'check', 'approve', 'check']);
    expect(returned.tasks.at(-1)).toMatchObject({
      status: 'PENDING',
      dueAt: new Date('2026-11-03T13:30:00.000Z'),
    });
  });

  it('keeps every rejection when a step is rejected twice', () => {
    let state = approvals.reject(
      atApproval(),
      'approve',
      'user-approver',
      T1,
      'First reason',
    ).state;
    state = approvals.completeTask(state, 'prepare', 'user-hr', T2).state;
    state = approvals.completeTask(state, 'check', 'user-hr', T2).state;

    const { state: twice } = approvals.reject(state, 'approve', 'user-approver', T3, 'Second');

    expect(
      twice.tasks.filter((t) => t.stepKey === 'approve').map((t) => [t.outcome, t.rejectionReason]),
    ).toEqual([
      ['REJECTED', 'First reason'],
      ['REJECTED', 'Second'],
    ]);
    expect(twice.tasks.at(-1)).toMatchObject({ stepKey: 'prepare', status: 'PENDING' });
    expect(twice.currentStepKey).toBe('prepare');
  });

  it('stores the reason without its surrounding spaces', () => {
    const { state, transitions } = approvals.reject(
      atApproval(),
      'approve',
      'user-approver',
      T2,
      '  Wrong quantity  ',
    );

    expect(state.tasks[2]!.rejectionReason).toBe('Wrong quantity');
    expect(transitions[0]!.reason).toBe('Wrong quantity');
  });

  it('leaves the earlier rounds alone when the returned work later fails or is cancelled', () => {
    let state = approvals.reject(
      atApproval(),
      'approve',
      'user-approver',
      T2,
      'Wrong quantity',
    ).state;
    state = approvals.completeTask(state, 'prepare', 'user-hr', T3).state;
    const history = state.tasks.slice(0, 4);

    const failed = approvals.fail(state, 'check', T3, 'Retries exhausted');
    expect(failed.state.tasks.slice(0, 4)).toEqual(history);
    expect(failed.state.tasks.at(-1)).toMatchObject({ stepKey: 'check', status: 'BLOCKED' });
    expect(failed.transitions.filter((t) => t.type === 'task.blocked')).toHaveLength(1);

    const cancelled = approvals.cancel(state, T3, 'Order cancelled');
    expect(cancelled.state.tasks.slice(0, 4)).toEqual(history);
    expect(cancelled.state.tasks.at(-1)).toMatchObject({ stepKey: 'check', status: 'SKIPPED' });
    expect(cancelled.transitions.filter((t) => t.type === 'task.skipped')).toHaveLength(1);
  });

  it('refuses a rejection of a blocked task until it is unblocked', () => {
    const state = atApproval();
    const blocked: WorkflowInstanceSnapshot = {
      ...state,
      tasks: state.tasks.map((t) => (t.stepKey === 'approve' ? { ...t, status: 'BLOCKED' } : t)),
    };

    expect(() => approvals.reject(blocked, 'approve', 'user-approver', T2, 'No')).toThrow(
      ConflictError,
    );
  });

  it('never changes the state it is given', () => {
    const state = deepFreeze(atApproval());

    expect(() =>
      approvals.reject(state, 'approve', 'user-approver', T2, 'Wrong quantity'),
    ).not.toThrow();
  });

  it('refuses a definition whose rejection returns to the step itself, a later step or no step', () => {
    const withReturn = (returnTo: string): WorkflowDefinitionView => ({
      ...APPROVAL,
      steps: APPROVAL.steps.map((s) =>
        s.key === 'approve' ? { ...s, onReject: { returnTo } } : s,
      ),
    });

    expect(() => new WorkflowStateMachine(withReturn('approve'))).toThrow(ConflictError);
    expect(() => new WorkflowStateMachine(withReturn('notify'))).toThrow(ConflictError);
    expect(() => new WorkflowStateMachine(withReturn('no-such-step'))).toThrow(ConflictError);
  });

  it('records a completed task’s outcome as COMPLETED', () => {
    const [prepare] = approvals.completeTask(approvals.start(T0).state, 'prepare', 'user-hr', T1)
      .state.tasks;

    expect(prepare).toMatchObject({ status: 'DONE', outcome: 'COMPLETED', rejectionReason: null });
  });
});

describe('Completing a task (C-6, area 2)', () => {
  it.todo('lets only the assignee role complete the task (403 otherwise)');
  it.todo('keeps the optional note with the audit event');
  it.todo('returns the task as DONE with who completed it and when');
});
