/**
 * Test skeleton for area 4's governance administration (stories F-1, F-3,
 * F-4 and F-5). The owner writes the classes and turns each case into a real
 * test; the module's line coverage must reach 80% (docs/team/module-ownership.md).
 */
describe('Roles and field masking (F-1, area 4)', () => {
  it.todo('changes a clearance rule, reloads the access policy and audits the change');
  it.todo('masks the field on the next request after its rule changes, with no restart');
  it.todo('refuses to give SYSTEM_ADMIN conflicts:resolve (separation of duties)');
  it.todo('refuses a change that would leave no role with governance:manage');
});

describe('Data classification (F-3, area 4)', () => {
  it.todo('shows every canonical field with its level and the roles that may see it');
  it.todo('audits a change of level with who made it and why');
  it.todo('refuses to lower a field that a transfer register entry depends on without review');
});

describe('Cross-border transfer register (F-4, area 4)', () => {
  it.todo('approves a PENDING_REVIEW entry: its fields reach HQ roles on the next request');
  it.todo('suspends or expires an entry: its fields are withheld again at once');
  it.todo('raises the version when what an entry covers changes, and audits who changed it');
  it.todo('records the reason with every status change');
  it.todo('masks a field with no ACTIVE entry as not approved when HQ reads it');
});

describe('Retention and purge (F-5, area 4)', () => {
  it.todo('runs the purge on a schedule, as a job with retries');
  it.todo('deletes, anonymises or archives data past its period, as each rule says');
  it.todo('records what each run did in lastAppliedAt and the audit log');
  it.todo('applies an entity rule before the group-wide one for the same category');
});
