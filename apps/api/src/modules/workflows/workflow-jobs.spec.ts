/**
 * Test skeleton for area 2's queued step jobs, retries and idempotency
 * (story C-2), on the platform's BullMQ `workflow` queue.
 */
describe('Workflow step jobs (C-2, area 2)', () => {
  it.todo('retries a failed step with exponential backoff');
  it.todo('marks the instance FAILED after the last attempt, so a person sees it');
  it.todo('does not repeat a side effect when a job retries after a partial success');
  it.todo('uses an idempotency key per instance and step');
});

describe('SLA reminders and escalations (C-4, area 2)', () => {
  it.todo('sets a task’s due time from its step’s SLA hours');
  it.todo('marks open work DUE_SOON as its due time nears, then OVERDUE');
  it.todo('sends one reminder, then one escalation, for each overdue task');
  it.todo('cancels the scheduled reminders when the task is completed');
  it.todo('never reminds or escalates a finished task');
});

describe('Notifications (C-5, area 2)', () => {
  it.todo('sends a step’s message to the entity’s Teams or DingTalk mock');
  it.todo('does not send the same message twice when a delivery is retried');
  it.todo('records a failed delivery on the instance timeline');
});
