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

describe('Completing a task (C-6, area 2)', () => {
  it.todo('lets only the assignee role complete the task (403 otherwise)');
  it.todo('keeps the optional note with the audit event');
  it.todo('returns the task as DONE with who completed it and when');
});
