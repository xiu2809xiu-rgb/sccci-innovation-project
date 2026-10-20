import type { SourceOfTruth } from '@huitong/shared';

import { canonicalJson } from '../../../infrastructure/audit/canonical-json.js';

/** What one source holds for one field of one employee. */
export interface Observation {
  connectorId: string;
  value: unknown;
  observedAt: Date;
}

/** Everything the merge needs to decide one field. */
export interface MergeInput {
  /** The master's value now; undefined while the employee does not exist yet. */
  current: unknown;
  /** Every source's latest value for the field, the one being loaded included. */
  observations: readonly Observation[];
  /** The field's owner for the employee's entity (FieldSourcePolicy); null when no single source owns it. */
  policyOwner: string | null;
  /** The source HR chose for this record when resolving an earlier conflict. */
  chosenSource: string | null;
  /** HR's typed-in value from the last resolved conflict, with the values it was chosen over. */
  manualDecision: { value: unknown; overruled: readonly unknown[] } | null;
  /** Whether the field already has an open conflict. */
  hasOpenConflict: boolean;
}

export type MasterAction =
  { action: 'keep' } | { action: 'set'; value: unknown; connectorId: string | null };

export type ConflictAction =
  { action: 'none' } | { action: 'open'; candidates: Observation[] } | { action: 'close' };

export interface MergeDecision {
  master: MasterAction;
  conflict: ConflictAction;
  sourceOfTruth: SourceOfTruth;
}

/** Equality of canonical values (key order and Date objects do not matter). */
export function sameValue(a: unknown, b: unknown): boolean {
  return canonicalJson(a ?? null) === canonicalJson(b ?? null);
}

function distinctValues(observations: readonly Observation[]): unknown[] {
  const seen = new Map<string, unknown>();
  for (const observation of observations) {
    seen.set(canonicalJson(observation.value ?? null), observation.value);
  }
  return [...seen.values()];
}

function setOrKeep(current: unknown, value: unknown, connectorId: string | null): MasterAction {
  return current !== undefined && sameValue(current, value)
    ? { action: 'keep' }
    : { action: 'set', value, connectorId };
}

/**
 * Decides one field of one employee from what every source holds (per-field
 * source of truth, facts sheet section 6):
 *
 * 1. A field with an owner takes the owner's value: the source HR chose for
 *    this record, otherwise the policy owner for the entity. Other sources are
 *    recorded as provenance and never open a conflict.
 * 2. A field without an owner takes the value the sources agree on. When they
 *    disagree, a conflict opens for HR and the master keeps what it had.
 * 3. A value HR typed in stands for as long as the sources still hold exactly
 *    the values it overruled; a new value from any source reopens the question.
 */
export function mergeField(input: MergeInput): MergeDecision {
  const { current, observations, policyOwner, chosenSource, manualDecision, hasOpenConflict } =
    input;
  const close: ConflictAction = hasOpenConflict ? { action: 'close' } : { action: 'none' };
  const owner = chosenSource ?? policyOwner;

  if (owner !== null) {
    const sourceOfTruth: SourceOfTruth = {
      kind: chosenSource !== null ? 'HR_DECISION' : 'POLICY',
      connectorId: owner,
    };
    const fromOwner = observations.find((observation) => observation.connectorId === owner);
    if (fromOwner) {
      return { master: setOrKeep(current, fromOwner.value, owner), conflict: close, sourceOfTruth };
    }
    // The owner has not reported this field yet: fill a gap from another source, never overwrite.
    const fallback = observations[0];
    const master: MasterAction =
      (current === undefined || current === null) && fallback
        ? setOrKeep(current, fallback.value, fallback.connectorId)
        : { action: 'keep' };
    return { master, conflict: close, sourceOfTruth };
  }

  const sourceOfTruth: SourceOfTruth = { kind: 'NONE', connectorId: null };
  const values = distinctValues(observations);
  const [first] = observations;
  if (values.length <= 1) {
    const master = first
      ? setOrKeep(current, first.value, first.connectorId)
      : ({ action: 'keep' } as const);
    return { master, conflict: close, sourceOfTruth };
  }

  if (manualDecision) {
    const overruled = new Set(
      manualDecision.overruled.map((value) => canonicalJson(value ?? null)),
    );
    const unchanged = values.every((value) => overruled.has(canonicalJson(value ?? null)));
    if (unchanged) {
      return {
        master: setOrKeep(current, manualDecision.value, null),
        conflict: { action: 'none' },
        sourceOfTruth,
      };
    }
  }

  // A new employee whose sources already disagree starts with the first source's value.
  const master: MasterAction =
    current === undefined && first
      ? { action: 'set', value: first.value, connectorId: first.connectorId }
      : { action: 'keep' };
  return { master, conflict: { action: 'open', candidates: [...observations] }, sourceOfTruth };
}
