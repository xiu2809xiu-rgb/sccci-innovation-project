/**
 * Test skeleton for area 3's template rendering and .xlsx export (story D-4):
 * a Strategy per report renderer, checked against a golden file.
 */
describe('Company template rendering and export (D-4, area 3)', () => {
  it.todo('renders a consolidated month in the template layout exactly, column for column');
  it.todo('writes values, not formulas, so the file reads the same in every spreadsheet');
  it.todo('matches the golden .xlsx file for the September sample');
  it.todo('previews the rows before any export, and exports nothing while exceptions are open');
  it.todo(
    'leaves out every field the transfer register withholds from the requester’s entity (B-7)',
  );
  it.todo('audits each export with the requester, the month and the fields left out');
});
