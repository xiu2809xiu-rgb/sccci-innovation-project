import { describe, expect, it } from 'vitest';

import { fieldsCoveredBy, TRANSFER_CATEGORIES } from './transfer-categories.js';

describe('fieldsCoveredBy', () => {
  it('expands each category into its canonical fields', () => {
    expect([...fieldsCoveredBy(['work-contact'])].sort()).toEqual(['workEmail', 'workPhone']);
    expect(fieldsCoveredBy(['identity']).size).toBe(TRANSFER_CATEGORIES.identity.length);
  });

  it('accepts a single canonical field beside the categories', () => {
    const fields = fieldsCoveredBy(['identity', 'jobGrade']);
    expect(fields.has('jobGrade')).toBe(true);
    expect(fields.has('fullNameLocal')).toBe(true);
    expect(fields.has('dateOfBirth')).toBe(false);
  });

  it('covers nothing for an entry it does not know, so a typo withholds instead of sharing', () => {
    expect(fieldsCoveredBy(['indentity', 'salary', ''])).toEqual(new Set());
  });
});
