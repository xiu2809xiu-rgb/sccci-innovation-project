import type {
  Role,
  WorkflowDefinitionView,
  WorkflowInstanceStatus,
  WorkflowStepDefinition,
  WorkflowTaskStatus,
} from '@huitong/shared';

import { ConflictError } from '../../common/errors/app-error.js';

/** One step's task as the state machine sees it. */
export interface WorkflowTaskSnapshot {
  readonly stepKey: string;
  readonly assigneeRole: Role;
  readonly status: WorkflowTaskStatus;
  readonly dueAt: Date;
  readonly completedAt: Date | null;
  /** The user who completed it. */
  readonly completedBy: string | null;
  /** Why the task is blocked, so the person it is flagged for knows what to do. */
  readonly blockedReason: string | null;
}

/** An instance as the state machine sees it: no ids, no Prisma, nothing to save. */
export interface WorkflowInstanceSnapshot {
  readonly definitionKey: string;
  readonly definitionVersion: number;
  readonly status: WorkflowInstanceStatus;
  /** The step waiting for someone; null once the instance has finished. */
  readonly currentStepKey: string | null;
  /** One per step that has started, in step order. */
  readonly tasks: readonly WorkflowTaskSnapshot[];
  readonly completedAt: Date | null;
}

export type WorkflowTransitionType =
  | 'instance.started'
  | 'instance.paused'
  | 'instance.resumed'
  | 'instance.completed'
  | 'instance.failed'
  | 'instance.cancelled'
  | 'task.created'
  | 'task.completed'
  | 'task.blocked'
  | 'task.skipped';

/** Something that happened in one command. The service audits each one and adds it to the timeline. */
export interface WorkflowTransition {
  readonly type: WorkflowTransitionType;
  /** The step it concerns, if any. */
  readonly stepKey: string | null;
  readonly at: Date;
  /** Why it happened, when the caller said: what a pause waits for, why a step failed. */
  readonly reason: string | null;
}

export interface WorkflowTransitionResult {
  readonly state: WorkflowInstanceSnapshot;
  readonly transitions: readonly WorkflowTransition[];
}

/**
 * Which instance status may move to which. The last three are final: nothing
 * leaves them. This table is the one place that decides what is legal.
 */
const INSTANCE_TRANSITIONS: Readonly<
  Record<WorkflowInstanceStatus, readonly WorkflowInstanceStatus[]>
> = {
  RUNNING: ['WAITING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  WAITING: ['RUNNING', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

/** Task statuses a person can complete from; a blocked task has to be unblocked first. */
const COMPLETABLE_TASK_STATUSES: readonly WorkflowTaskStatus[] = ['PENDING', 'IN_PROGRESS'];

/** Task statuses where someone may already have done real work that a cancel has to undo. */
const PICKED_UP_TASK_STATUSES: readonly WorkflowTaskStatus[] = ['IN_PROGRESS', 'BLOCKED'];

const HOUR_MS = 60 * 60 * 1000;

/** True when the transition table allows an instance to move from `from` to `to`. */
export function canTransition(from: WorkflowInstanceStatus, to: WorkflowInstanceStatus): boolean {
  return INSTANCE_TRANSITIONS[from].includes(to);
}

/**
 * Runs one version of a workflow definition, one step after another (story
 * C-2). Every command takes the instance's current state and the time, and
 * returns the new state with what happened; it never changes the state it is
 * given and never saves anything. An illegal command throws a 409 ConflictError.
 *
 * An SLA clock starts when its step starts: a task is due `slaHours` later.
 */
export class WorkflowStateMachine {
  constructor(private readonly definition: WorkflowDefinitionView) {
    const keys = new Set(definition.steps.map((s) => s.key));
    if (keys.size !== definition.steps.length) {
      // Steps are found by key, so a repeated key would send the instance back to its first use.
      throw new ConflictError('A workflow definition cannot repeat a step key', {
        definition: `${definition.key}@${definition.version}`,
      });
    }
  }

  /** Starts an instance at the definition's first step. */
  start(at: Date): WorkflowTransitionResult {
    const first = this.definition.steps[0];
    if (!first) throw new ConflictError('The workflow definition has no steps');
    const state: WorkflowInstanceSnapshot = {
      definitionKey: this.definition.key,
      definitionVersion: this.definition.version,
      status: 'RUNNING',
      currentStepKey: first.key,
      tasks: [this.newTask(first, at)],
      completedAt: null,
    };
    return {
      state,
      transitions: [
        transition('instance.started', null, at),
        transition('task.created', first.key, at),
      ],
    };
  }

  /**
   * Completes the current step's task, then starts the next step, or
   * completes the instance after the last one.
   */
  completeTask(
    state: WorkflowInstanceSnapshot,
    stepKey: string,
    completedBy: string,
    at: Date,
  ): WorkflowTransitionResult {
    this.assertSameVersion(state);
    if (state.status !== 'RUNNING') {
      throw new ConflictError(`A ${state.status} workflow cannot complete a task`, {
        status: state.status,
      });
    }
    this.assertCurrentStep(state, stepKey);
    const task = state.tasks.find((t) => t.stepKey === stepKey);
    if (!task || !COMPLETABLE_TASK_STATUSES.includes(task.status)) {
      throw new ConflictError('The task cannot be completed from its current status', {
        stepKey,
        status: task?.status ?? null,
      });
    }

    const tasks = state.tasks.map((t) =>
      t === task ? { ...t, status: 'DONE' as const, completedAt: at, completedBy } : t,
    );
    const transitions = [transition('task.completed', stepKey, at)];

    const next = this.stepAfter(stepKey);
    if (!next) {
      transitions.push(transition('instance.completed', null, at));
      return {
        state: this.moveTo(state, 'COMPLETED', {
          tasks,
          currentStepKey: null,
          completedAt: at,
        }),
        transitions,
      };
    }

    transitions.push(transition('task.created', next.key, at));
    return {
      state: { ...state, tasks: [...tasks, this.newTask(next, at)], currentStepKey: next.key },
      transitions,
    };
  }

  /** Pauses on something outside HuiTong, such as the SAP record (C-7); the current step is kept. */
  pause(state: WorkflowInstanceSnapshot, at: Date, reason?: string): WorkflowTransitionResult {
    this.assertSameVersion(state);
    return {
      state: this.moveTo(state, 'WAITING'),
      transitions: [transition('instance.paused', state.currentStepKey, at, reason)],
    };
  }

  /** Resumes a paused instance at the step it paused on. */
  resume(state: WorkflowInstanceSnapshot, at: Date): WorkflowTransitionResult {
    this.assertSameVersion(state);
    return {
      state: this.moveTo(state, 'RUNNING'),
      transitions: [transition('instance.resumed', state.currentStepKey, at)],
    };
  }

  /**
   * Fails the instance after a step's last retry. The step's task is
   * blocked, so the board shows where it stopped and why. A failure for a
   * step that is no longer current (a stale or repeated job) is refused, so
   * it cannot fail a later, healthy step.
   */
  fail(
    state: WorkflowInstanceSnapshot,
    stepKey: string,
    at: Date,
    reason?: string,
  ): WorkflowTransitionResult {
    this.assertSameVersion(state);
    this.assertCurrentStep(state, stepKey);
    const next = this.moveTo(state, 'FAILED');
    const transitions: WorkflowTransition[] = [];
    const tasks = state.tasks.map((t) => {
      if (t.stepKey !== stepKey || t.status === 'DONE' || t.status === 'SKIPPED') return t;
      transitions.push(transition('task.blocked', stepKey, at, reason));
      return { ...t, status: 'BLOCKED' as const, blockedReason: reason ?? null };
    });
    transitions.push(transition('instance.failed', stepKey, at, reason));
    return { state: { ...next, tasks }, transitions };
  }

  /**
   * Cancels the instance, for example when its approval is cancelled. A task
   * nobody has picked up is skipped. A task someone has picked up may have
   * real work behind it (a laptop ordered, an account requested), so it is
   * blocked instead: it stays open and flagged for a person to undo.
   */
  cancel(state: WorkflowInstanceSnapshot, at: Date, reason?: string): WorkflowTransitionResult {
    this.assertSameVersion(state);
    const next = this.moveTo(state, 'CANCELLED');
    const transitions: WorkflowTransition[] = [];
    const tasks = state.tasks.map((t) => {
      if (t.status === 'PENDING') {
        transitions.push(transition('task.skipped', t.stepKey, at, reason));
        return { ...t, status: 'SKIPPED' as const };
      }
      if (PICKED_UP_TASK_STATUSES.includes(t.status)) {
        transitions.push(transition('task.blocked', t.stepKey, at, reason));
        return { ...t, status: 'BLOCKED' as const, blockedReason: reason ?? null };
      }
      return t;
    });
    transitions.push(transition('instance.cancelled', state.currentStepKey, at, reason));
    return { state: { ...next, tasks }, transitions };
  }

  /** Applies a status change the transition table allows, or throws. */
  private moveTo(
    state: WorkflowInstanceSnapshot,
    to: WorkflowInstanceStatus,
    changes: Partial<WorkflowInstanceSnapshot> = {},
  ): WorkflowInstanceSnapshot {
    if (!canTransition(state.status, to)) {
      throw new ConflictError(`A workflow cannot move from ${state.status} to ${to}`, {
        from: state.status,
        to,
      });
    }
    return { ...state, ...changes, status: to };
  }

  private assertCurrentStep(state: WorkflowInstanceSnapshot, stepKey: string): void {
    if (stepKey !== state.currentStepKey) {
      throw new ConflictError('Only the current step can be completed or failed', {
        stepKey,
        currentStepKey: state.currentStepKey,
      });
    }
  }

  /** An instance keeps the definition version it started on; running it on another is a bug. */
  private assertSameVersion(state: WorkflowInstanceSnapshot): void {
    if (
      state.definitionKey !== this.definition.key ||
      state.definitionVersion !== this.definition.version
    ) {
      throw new ConflictError('The instance belongs to another definition version', {
        instance: `${state.definitionKey}@${state.definitionVersion}`,
        definition: `${this.definition.key}@${this.definition.version}`,
      });
    }
  }

  private stepAfter(stepKey: string): WorkflowStepDefinition | undefined {
    const index = this.definition.steps.findIndex((s) => s.key === stepKey);
    return this.definition.steps[index + 1];
  }

  private newTask(step: WorkflowStepDefinition, at: Date): WorkflowTaskSnapshot {
    return {
      stepKey: step.key,
      assigneeRole: step.assigneeRole,
      status: 'PENDING',
      dueAt: new Date(at.getTime() + step.slaHours * HOUR_MS),
      completedAt: null,
      completedBy: null,
      blockedReason: null,
    };
  }
}

function transition(
  type: WorkflowTransitionType,
  stepKey: string | null,
  at: Date,
  reason?: string,
): WorkflowTransition {
  return { type, stepKey, at, reason: reason ?? null };
}
