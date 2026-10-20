import type { SyncPreviewItem } from '@huitong/shared';
import { describe, expect, it } from 'vitest';

import { changeDigestOf, contentHash } from './change-digest.js';

const update: SyncPreviewItem = {
  employeeNo: 'E100003',
  entityCode: 'SG01',
  kind: 'UPDATE',
  field: 'workPhone',
  before: '+6585283001',
  after: '+6581234599',
};
const create: SyncPreviewItem = {
  employeeNo: 'E100099',
  entityCode: 'SG01',
  kind: 'CREATE',
  field: null,
  before: null,
  after: null,
};

describe('changeDigestOf', () => {
  it('is the same whatever order the changes came in', () => {
    const created = [
      contentHash({ workEmail: 'a@orge.example' }),
      contentHash({ workEmail: 'b@orge.example' }),
    ];
    expect(changeDigestOf({ preview: [update, create], created })).toBe(
      changeDigestOf({ preview: [create, update], created: [...created].reverse() }),
    );
  });

  it('changes when a value changes', () => {
    expect(changeDigestOf({ preview: [update], created: [] })).not.toBe(
      changeDigestOf({ preview: [{ ...update, after: '+6581234500' }], created: [] }),
    );
  });

  it('changes when a new record would be created with other values', () => {
    expect(
      changeDigestOf({ preview: [create], created: [contentHash({ baseSalary: 9800 })] }),
    ).not.toBe(changeDigestOf({ preview: [create], created: [contentHash({ baseSalary: 9900 })] }));
  });

  it('gives a run that changes nothing its own fingerprint', () => {
    expect(changeDigestOf({ preview: [], created: [] })).toBe(
      changeDigestOf({ preview: [], created: [] }),
    );
    expect(changeDigestOf({ preview: [], created: [] })).not.toBe(
      changeDigestOf({ preview: [update], created: [] }),
    );
  });
});
