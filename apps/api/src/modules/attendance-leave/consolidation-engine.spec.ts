/**
 * Test skeleton for area 3's ingestion and validation (stories D-1 and D-3).
 * The owner writes the classes and turns each case into a real test; the
 * module's line coverage must reach 80% (docs/team/module-ownership.md).
 */
describe('Attendance and leave ingestion (D-1, area 3)', () => {
  it.todo('extracts a month from SG HR and CN HQ through their SystemConnector adapters');
  it.todo('stores each record with its source category, unique per connector and source id');
  it.todo('runs again over the same month without duplicating records');
  it.todo('reports a record for an unknown employee as UNKNOWN_EMPLOYEE, never drops it');
  it.todo('matches people on the employee number only, never on names');
});

describe('Consolidation validation (D-3, area 3)', () => {
  it.todo('reports overlapping leave with both records');
  it.todo('reports leave on a non-working day of its entity, using that country’s holidays (A-36)');
  it.todo('reports leave still pending at month end, and leaves it out of the totals');
  it.todo('splits a leave record across months by the working days in each');
  it.todo('reports totals that do not reconcile with the attendance days as TOTALS_MISMATCH');
  it.todo('finishes NEEDS_REVIEW while exceptions are open, SUCCEEDED once they are settled');
  it.todo('runs as a job on QUEUES.consolidation and records who started it');
});
