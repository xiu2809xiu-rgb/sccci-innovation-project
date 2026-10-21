import { changedFields } from './changed-fields.js';

describe('changedFields', () => {
  it('names the fields whose values differ, sorted, and never the values', () => {
    expect(
      changedFields(
        { jobTitle: 'Analyst', workLocation: 'Singapore', departmentCode: 'FIN' },
        { jobTitle: 'Senior Analyst', workLocation: 'Singapore', departmentCode: 'OPS' },
      ),
    ).toEqual(['departmentCode', 'jobTitle']);
  });

  it('compares nested values by content, whatever the key order', () => {
    expect(
      changedFields(
        { address: { city: 'SG', postal: '01' } },
        { address: { postal: '01', city: 'SG' } },
      ),
    ).toEqual([]);
  });

  it('lists every field of a created or a removed record', () => {
    expect(changedFields(null, { status: 'PRE_HIRE', employeeNo: 'E100001' })).toEqual([
      'employeeNo',
      'status',
    ]);
    expect(changedFields({ status: 'ACTIVE' }, undefined)).toEqual(['status']);
  });

  it('counts a field that is added, removed or set to null', () => {
    expect(changedFields({ a: 1, b: 2 }, { b: null, c: 3 })).toEqual(['a', 'b', 'c']);
  });

  it('names nothing for events without field states', () => {
    expect(changedFields(null, null)).toEqual([]);
    expect(changedFields('started', ['x'])).toEqual([]);
  });
});
