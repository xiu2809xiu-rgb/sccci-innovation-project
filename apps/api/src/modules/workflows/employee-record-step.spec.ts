/**
 * Test skeleton for the employee-record step (story C-3), which hands over to
 * area 1's draft-from-hire use case (story B-6, docs/team/module-ownership.md).
 */
describe('Employee record step (C-3, area 2)', () => {
  it.todo('asks area 1 for a draft PRE_HIRE record linked to the request, never an active one');
  it.todo('records the workflow as the change source of the draft');
  it.todo('pushes the record to the SG HR mock only after HR approves a preview, audited');
  it.todo('makes the SG HR push idempotent');
  it.todo('labels the push as a write-back to a mock');
  it.todo('reports the onboarding milestones met, so area 1 can activate the record');
});
