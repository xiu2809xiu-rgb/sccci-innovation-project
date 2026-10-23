import { createHash } from 'node:crypto';

import type { SyncPreviewItem } from '@huitong/shared';

import { canonicalJson } from '../../../infrastructure/audit/canonical-json.js';

/** Everything a sync run would change: its preview items, and the values of each record it would create. */
export interface PlannedChanges {
  preview: readonly SyncPreviewItem[];
  /** A hash of each new record's values, which the preview does not list. */
  created: readonly string[];
  /** The version of the source the run read, when it names one (a staged file's SHA-256). */
  source?: string | null;
}

const order = (item: SyncPreviewItem) =>
  `${item.employeeNo}\u0000${item.field ?? ''}\u0000${item.kind}`;

/** A SHA-256 of a value's content, the same whatever the order of its keys. */
export function contentHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

/**
 * A fingerprint of planned changes, the same whatever order the records came
 * in. A preview stores it, and the apply that follows must arrive at the same
 * one before it writes anything.
 */
export function changeDigestOf(changes: PlannedChanges): string {
  const preview = [...changes.preview].sort((a, b) => order(a).localeCompare(order(b)));
  const created = [...changes.created].sort();
  // A source without versions keeps the digest it always had.
  return contentHash(
    changes.source ? { preview, created, source: changes.source } : { preview, created },
  );
}
