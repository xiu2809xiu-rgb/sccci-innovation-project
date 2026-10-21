/**
 * Test skeleton for area 2's handler of `oa.approval.completed` (story C-1).
 * Area 1 verifies, stores and publishes the event; the handler starts the
 * workflow (docs/team/area-1-integration-core.md, "OA webhooks and the events
 * other areas use").
 */
describe('OaApprovalHandler (C-1, area 2)', () => {
  it.todo('validates the payload with oaApprovalCompletedSchema and rejects anything else');
  it.todo('starts one instance for an approved MANPOWER_REQUEST, keyed by the OA event id');
  it.todo('ignores a second delivery of the same OA event id (the outbox may redeliver)');
  it.todo('records a REJECTED request without starting an instance');
  it.todo('ignores approval types other than MANPOWER_REQUEST');
  it.todo('copies the request id, title, headcount and expected start date into the context');
  it.todo('enqueues the first step as a job instead of running it inside the handler');
  it.todo('throws only when the event cannot be accepted, which marks the stored event FAILED');
});
