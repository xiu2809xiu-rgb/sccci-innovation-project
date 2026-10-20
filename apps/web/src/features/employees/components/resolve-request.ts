import type { Conflict, ResolveConflictRequest } from '@huitong/shared';

/** The choice value for "enter the correct value" beside the systems' values. */
export const MANUAL = 'manual';

/** A salary is an amount and a currency, which this form cannot take as one value. */
export const canEnterManually = (field: Conflict['field']) => field !== 'baseSalary';

/** The decision the form describes, or null while it is incomplete. */
export function requestOf(
  choice: string,
  manual: string,
  note: string,
): ResolveConflictRequest | null {
  if (choice === MANUAL) {
    return manual.trim() !== '' && note.trim().length >= 3
      ? { resolution: 'MANUAL_VALUE', value: manual.trim(), note: note.trim() }
      : null;
  }
  if (choice === '') return null;
  return {
    resolution: 'SOURCE_SELECTED',
    connectorId: choice,
    ...(note.trim() ? { note: note.trim() } : {}),
  };
}
