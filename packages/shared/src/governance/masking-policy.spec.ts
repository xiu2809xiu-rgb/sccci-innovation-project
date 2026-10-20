import { describe, expect, it } from 'vitest';

import { EMPLOYEE_FIELD_CLASSIFICATION, isWithinClearance } from './classification.js';
import { isMasked } from './masked-value.js';
import {
  DEFAULT_CLEARANCE_RULES,
  decideMasking,
  maskRecord,
  resolveClearance,
} from './masking-policy.js';

const rules = DEFAULT_CLEARANCE_RULES;

describe('classification', () => {
  it('orders levels from PUBLIC to RESTRICTED', () => {
    expect(isWithinClearance('INTERNAL', 'CONFIDENTIAL')).toBe(true);
    expect(isWithinClearance('RESTRICTED', 'CONFIDENTIAL')).toBe(false);
  });
});

describe('resolveClearance', () => {
  it('prefers an entity-specific rule over the catch-all', () => {
    expect(resolveClearance(rules, 'HR_SG', 'SG01')).toBe('RESTRICTED');
    expect(resolveClearance(rules, 'HR_SG', 'CN01')).toBe('CONFIDENTIAL');
  });

  it('falls back to PUBLIC when no rule matches the role', () => {
    expect(resolveClearance([], 'AUDITOR', 'SG01')).toBe('PUBLIC');
  });
});

describe('decideMasking', () => {
  it('shows restricted SG data to SG HR', () => {
    expect(decideMasking(rules, 'HR_SG', 'SG01', 'RESTRICTED')).toEqual({ visible: true });
  });

  it('hides restricted CN data from SG HR because of entity scope', () => {
    expect(decideMasking(rules, 'HR_SG', 'CN01', 'RESTRICTED')).toEqual({
      visible: false,
      reason: 'ENTITY_SCOPE',
    });
  });

  it('hides restricted SG data from HQ HR pending a cross-border transfer entry', () => {
    expect(decideMasking(rules, 'HR_HQ', 'SG01', 'RESTRICTED')).toEqual({
      visible: false,
      reason: 'CROSS_BORDER_NOT_APPROVED',
    });
  });

  it('hides confidential data from roles cleared only for internal data', () => {
    expect(decideMasking(rules, 'HIRING_MANAGER', 'SG01', 'CONFIDENTIAL')).toEqual({
      visible: false,
      reason: 'ROLE_CLEARANCE',
    });
  });

  it('keeps system administrators away from restricted data everywhere', () => {
    expect(decideMasking(rules, 'SYSTEM_ADMIN', 'SG01', 'RESTRICTED')).toEqual({
      visible: false,
      reason: 'ROLE_CLEARANCE',
    });
  });
});

describe('maskRecord', () => {
  const record = {
    employeeNo: 'E100023',
    workPhone: '+6591234567',
    baseSalary: { amount: 5800, currency: 'SGD' },
    bankAccountLast4: null,
  };

  it('replaces only the fields above the caller clearance', () => {
    const masked = maskRecord(record, EMPLOYEE_FIELD_CLASSIFICATION, {
      rules,
      role: 'HIRING_MANAGER',
      entityCode: 'SG01',
    });
    expect(masked.employeeNo).toBe('E100023');
    expect(isMasked(masked.workPhone)).toBe(true);
    expect(masked.baseSalary).toEqual({
      masked: true,
      classification: 'RESTRICTED',
      reason: 'ROLE_CLEARANCE',
    });
  });

  it('leaves empty values alone and does not mutate the input', () => {
    const masked = maskRecord(record, EMPLOYEE_FIELD_CLASSIFICATION, {
      rules,
      role: 'AUDITOR',
      entityCode: 'SG01',
    });
    expect(masked.bankAccountLast4).toBeNull();
    expect(record.workPhone).toBe('+6591234567');
  });

  it('returns the record unchanged for a fully cleared caller', () => {
    const masked = maskRecord(record, EMPLOYEE_FIELD_CLASSIFICATION, {
      rules,
      role: 'HR_SG',
      entityCode: 'SG01',
    });
    expect(masked).toEqual(record);
  });
});
