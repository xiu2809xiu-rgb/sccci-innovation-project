/**
 * Test skeleton for area 2's workflow state machine (stories C-2 and C-6).
 * The owner writes the class and turns each case into a real test; the
 * module's line coverage must reach 80% (docs/team/module-ownership.md).
 */
describe('WorkflowStateMachine (C-2, area 2)', () => {
  it.todo('starts an instance at the first step of the definition version it was created with');
  it.todo('creates the task for a step with its assignee role and its due time');
  it.todo('moves to the next step when the current task is completed');
  it.todo('refuses to complete a task that is not the current step (409 CONFLICT)');
  it.todo('refuses any transition out of COMPLETED, FAILED or CANCELLED (409 CONFLICT)');
  it.todo('pauses as WAITING and resumes as RUNNING without losing the current step');
  it.todo('completes the instance after the last step');
  it.todo('cancels the open tasks when the instance is cancelled');
  it.todo('writes an audit event for every transition, with the actor and the trace id');
  it.todo('publishes the lifecycle events only after the transaction commits');
  it.todo('never makes the employee record active: activation is area 1’s rule (B-6)');
});

describe('Completing a task (C-6, area 2)', () => {
  it.todo('lets only the assignee role complete the task (403 otherwise)');
  it.todo('keeps the optional note with the audit event');
  it.todo('returns the task as DONE with who completed it and when');
});
