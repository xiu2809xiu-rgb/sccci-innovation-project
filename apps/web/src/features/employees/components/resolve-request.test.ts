import { describe, expect, it } from 'vitest';

import { canEnterManually, MANUAL, requestOf } from './resolve-request';

describe('requestOf', () => {
  it("keeps a system's value, with an optional note", () => {
    expect(requestOf('cn-hq', '', '')).toEqual({
      resolution: 'SOURCE_SELECTED',
      connectorId: 'cn-hq',
    });
    expect(requestOf('cn-hq', '', ' Confirmed with payroll ')).toEqual({
      resolution: 'SOURCE_SELECTED',
      connectorId: 'cn-hq',
      note: 'Confirmed with payroll',
    });
  });

  it('needs a value and a note of at least three characters for a typed value', () => {
    expect(requestOf(MANUAL, 'Finance Manager', 'ok')).toBeNull();
    expect(requestOf(MANUAL, '  ', 'From the signed contract')).toBeNull();
    expect(requestOf(MANUAL, ' Finance Manager ', 'From the signed contract')).toEqual({
      resolution: 'MANUAL_VALUE',
      value: 'Finance Manager',
      note: 'From the signed contract',
    });
  });

  it('describes nothing before a choice', () => {
    expect(requestOf('', 'anything', 'a long enough note')).toBeNull();
  });
});

describe('canEnterManually', () => {
  it('leaves salaries to a system value, since they are an amount and a currency', () => {
    expect(canEnterManually('baseSalary')).toBe(false);
    expect(canEnterManually('jobTitle')).toBe(true);
  });
});
