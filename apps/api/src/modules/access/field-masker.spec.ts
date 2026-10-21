import { describe, expect, it } from 'vitest';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AccessPolicyService } from './access-policy.service.js';
import type { AccessPolicyRepository } from './access-policy.repository.js';
import { DIRECTORY_FIELDS, disclosureOf, isListable } from './destination-policy.js';
import { FieldMasker } from './field-masker.js';

/** The seeded register, minus the pending compensation entry: only ACTIVE entries count. */
const ACTIVE = [
  {
    id: 'sg-to-hq',
    fromEntityCode: 'SG01',
    toEntityCode: 'CN01',
    dataCategories: ['identity', 'job-and-organisation', 'work-contact', 'jobGrade', 'costCenter'],
    version: 3,
  },
  {
    id: 'hq-to-sg',
    fromEntityCode: 'CN01',
    toEntityCode: 'SG01',
    dataCategories: ['identity', 'job-and-organisation', 'work-contact'],
    version: 1,
  },
];

const HQ: AuthenticatedUser = { id: 'u-hq', role: 'HR_HQ', homeEntityCode: 'CN01' };
const SG: AuthenticatedUser = { id: 'u-sg', role: 'HR_SG', homeEntityCode: 'SG01' };

async function masker(transfers: typeof ACTIVE = ACTIVE): Promise<FieldMasker> {
  const repository = {
    rolePermissions: () => Promise.resolve([]),
    clearanceRules: () => Promise.resolve([]),
    activeTransfers: () => Promise.resolve(transfers),
  } as unknown as AccessPolicyRepository;
  const logger = { setContext: () => undefined, warn: () => undefined };
  const access = new AccessPolicyService(repository, logger as never);
  await access.reload();
  return new FieldMasker(access);
}

describe('disclosureOf', () => {
  it("applies no allowlist to the viewer's own entity", () => {
    expect(disclosureOf(ACTIVE, 'SG01', 'SG01')).toEqual({ kind: 'home' });
  });

  it('shares the union of the ACTIVE transfers from the source to the destination, with their versions', () => {
    const second = {
      ...ACTIVE[1]!,
      id: 'sg-to-hq-dob',
      fromEntityCode: 'SG01',
      toEntityCode: 'CN01',
      dataCategories: ['dateOfBirth'],
      version: 1,
    };
    const disclosure = disclosureOf([...ACTIVE, second], 'SG01', 'CN01');
    expect(disclosure.kind).toBe('shared');
    if (disclosure.kind !== 'shared') return;
    expect(disclosure.fields.has('dateOfBirth')).toBe(true);
    expect(disclosure.fields.has('baseSalary')).toBe(false);
    expect(disclosure.transfers).toEqual([
      { id: 'sg-to-hq', version: 3 },
      { id: 'sg-to-hq-dob', version: 1 },
    ]);
  });

  it('shares nothing between entities no ACTIVE transfer links', () => {
    const disclosure = disclosureOf(ACTIVE, 'MY01', 'SG01');
    expect(disclosure).toEqual({ kind: 'shared', fields: new Set(), transfers: [] });
    expect(isListable(disclosure)).toBe(false);
  });

  it('lists another entity only when every directory field is shared', () => {
    expect(isListable(disclosureOf(ACTIVE, 'SG01', 'CN01'))).toBe(true);
    const noContact = [{ ...ACTIVE[0]!, dataCategories: ['identity', 'job-and-organisation'] }];
    expect(isListable(disclosureOf(noContact, 'SG01', 'CN01'))).toBe(false);
    expect(DIRECTORY_FIELDS).toContain('workEmail');
  });
});

describe('FieldMasker and the transfer register', () => {
  it('withholds a field the register does not share, though the role is cleared for it', async () => {
    const fields = await masker();
    // HR_HQ is cleared up to CONFIDENTIAL for SG01, and dateOfBirth is CONFIDENTIAL.
    expect(fields.value('dateOfBirth', '1992-07-04', HQ, 'SG01')).toEqual({
      masked: true,
      classification: 'CONFIDENTIAL',
      reason: 'CROSS_BORDER_NOT_APPROVED',
    });
    expect(fields.canSee('dateOfBirth', HQ, 'SG01')).toBe(false);
    expect(fields.value('jobGrade', 'M2', HQ, 'SG01')).toBe('M2');
  });

  it("shows the same field to the viewer's own entity", async () => {
    const fields = await masker();
    expect(fields.value('dateOfBirth', '1990-01-15', HQ, 'CN01')).toBe('1990-01-15');
    expect(fields.value('dateOfBirth', '1992-07-04', SG, 'SG01')).toBe('1992-07-04');
    expect(fields.withheld(['dateOfBirth'], SG, 'SG01')).toBeNull();
  });

  it('names the withheld fields and the transfer versions that decided it', async () => {
    const fields = await masker();
    expect(fields.withheld(['dateOfBirth', 'jobGrade', 'baseSalary'], HQ, 'SG01')).toEqual({
      source: 'SG01',
      destination: 'CN01',
      fields: ['dateOfBirth', 'baseSalary'],
      transfers: [{ id: 'sg-to-hq', version: 3 }],
    });
  });

  it('lets a viewer list another entity only while the register shares its directory fields', async () => {
    expect((await masker()).listable(HQ)).toEqual(['SG01', 'CN01']);
    const fields = await masker([]);
    expect(fields.listable(HQ)).toEqual(['CN01']);
    expect(fields.canList(SG, 'CN01')).toBe(false);
  });
});
