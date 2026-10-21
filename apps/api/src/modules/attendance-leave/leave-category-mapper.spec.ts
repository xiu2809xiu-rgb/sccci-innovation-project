/**
 * Test skeleton for area 3's leave-category mapping (story D-2): a Strategy
 * per source system, configured by the approved rules in the database.
 */
describe('Leave-category mapping (D-2, area 3)', () => {
  it.todo('maps CN HQ 年假, 病假 and 调休 to ANNUAL, SICK and TIME_OFF_IN_LIEU');
  it.todo('maps SG HR AL, SL and TOIL to the same canonical categories');
  it.todo('lists a code with no approved rule as UNMAPPED_CATEGORY, and guesses nothing');
  it.todo('reports 探亲假 (home leave) as NO_TEMPLATE_COLUMN, because the template has no column');
  it.todo('uses only ACTIVE rules: a DRAFT rule waits for approval');
  it.todo('applies a changed rule only after approval, and audits the proposal and the approval');
  it.todo('adds a new subsidiary’s codes as configuration, with no code change');
});
