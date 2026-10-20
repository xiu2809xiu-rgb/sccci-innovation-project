import { describe, expect, it } from 'vitest';

import { mergeField, sameValue, type MergeInput, type Observation } from './field-merger.js';

const at = new Date('2026-10-20T02:00:00Z');
const sg = (value: unknown): Observation => ({ connectorId: 'sg-hr', value, observedAt: at });
const cn = (value: unknown): Observation => ({ connectorId: 'cn-hq', value, observedAt: at });

const input = (overrides: Partial<MergeInput>): MergeInput => ({
  current: undefined,
  observations: [],
  policyOwner: null,
  chosenSource: null,
  manualDecision: null,
  hasOpenConflict: false,
  ...overrides,
});

describe('mergeField with an owner', () => {
  it('takes the policy owner value and never opens a conflict (drift: work phone)', () => {
    const decision = mergeField(
      input({
        current: '+6591110000',
        observations: [sg('+6591234567'), cn('+6591110000')],
        policyOwner: 'sg-hr',
      }),
    );
    expect(decision.master).toEqual({ action: 'set', value: '+6591234567', connectorId: 'sg-hr' });
    expect(decision.conflict).toEqual({ action: 'none' });
    expect(decision.sourceOfTruth).toEqual({ kind: 'POLICY', connectorId: 'sg-hr' });
  });

  it('keeps the master when it already holds the owner value', () => {
    const decision = mergeField(
      input({ current: 'Ng', observations: [sg('Ng'), cn('Wu')], policyOwner: 'sg-hr' }),
    );
    expect(decision.master).toEqual({ action: 'keep' });
  });

  it('fills a gap from another source until the owner reports, but never overwrites', () => {
    const empty = mergeField(
      input({ current: null, observations: [cn('P6')], policyOwner: 'sg-hr' }),
    );
    expect(empty.master).toEqual({ action: 'set', value: 'P6', connectorId: 'cn-hq' });
    const filled = mergeField(
      input({ current: 'P5', observations: [cn('P6')], policyOwner: 'sg-hr' }),
    );
    expect(filled.master).toEqual({ action: 'keep' });
  });

  it("lets HR's chosen source beat the policy owner and closes the open conflict", () => {
    const decision = mergeField(
      input({
        current: 'OPS',
        observations: [sg('COMP'), cn('OPS')],
        policyOwner: 'cn-hq',
        chosenSource: 'sg-hr',
        hasOpenConflict: true,
      }),
    );
    expect(decision.master).toEqual({ action: 'set', value: 'COMP', connectorId: 'sg-hr' });
    expect(decision.conflict).toEqual({ action: 'close' });
    expect(decision.sourceOfTruth).toEqual({ kind: 'HR_DECISION', connectorId: 'sg-hr' });
  });
});

describe('mergeField without an owner', () => {
  it('takes the only value there is', () => {
    const decision = mergeField(input({ observations: [sg('HR Business Partner')] }));
    expect(decision.master).toEqual({
      action: 'set',
      value: 'HR Business Partner',
      connectorId: 'sg-hr',
    });
    expect(decision.sourceOfTruth).toEqual({ kind: 'NONE', connectorId: null });
  });

  it('opens a conflict when sources disagree and keeps the master as it was (drift: department)', () => {
    const decision = mergeField(input({ current: 'OPS', observations: [sg('COMP'), cn('OPS')] }));
    expect(decision.master).toEqual({ action: 'keep' });
    expect(decision.conflict).toEqual({ action: 'open', candidates: [sg('COMP'), cn('OPS')] });
  });

  it('starts a new employee with the first value even when sources already disagree', () => {
    const decision = mergeField(input({ observations: [cn('2019-04-04'), sg('2019-03-04')] }));
    expect(decision.master).toEqual({ action: 'set', value: '2019-04-04', connectorId: 'cn-hq' });
    expect(decision.conflict.action).toBe('open');
  });

  it('closes the conflict once the sources agree again', () => {
    const decision = mergeField(
      input({ current: 'OPS', observations: [sg('COMP'), cn('COMP')], hasOpenConflict: true }),
    );
    expect(decision.master).toEqual({ action: 'set', value: 'COMP', connectorId: 'sg-hr' });
    expect(decision.conflict).toEqual({ action: 'close' });
  });

  it("keeps HR's typed-in value while the sources still hold what it overruled", () => {
    const manualDecision = {
      value: 'Senior Relationship Manager',
      overruled: ['Relationship Manager', 'RM'],
    };
    const standing = mergeField(
      input({
        current: 'Senior Relationship Manager',
        observations: [sg('RM'), cn('Relationship Manager')],
        manualDecision,
      }),
    );
    expect(standing.master).toEqual({ action: 'keep' });
    expect(standing.conflict).toEqual({ action: 'none' });

    const reopened = mergeField(
      input({
        current: 'Senior Relationship Manager',
        observations: [sg('Associate Director'), cn('RM')],
        manualDecision,
      }),
    );
    expect(reopened.conflict.action).toBe('open');
  });
});

describe('sameValue', () => {
  it('ignores key order and treats Dates like their ISO text', () => {
    expect(sameValue({ amount: 1, currency: 'SGD' }, { currency: 'SGD', amount: 1 })).toBe(true);
    expect(sameValue(new Date('2026-01-01T00:00:00.000Z'), '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(sameValue(undefined, null)).toBe(true);
    expect(sameValue('a', 'b')).toBe(false);
  });
});
