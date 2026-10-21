import { canonicalJson } from '../../infrastructure/audit/canonical-json.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The top-level fields whose values differ between an event's before and
 * after states, sorted. A created record lists every field it was created
 * with, a removed one every field it had. Only the names leave the audit log
 * through the viewer, never the values.
 */
export function changedFields(before: unknown, after: unknown): string[] {
  const from = isRecord(before) ? before : {};
  const to = isRecord(after) ? after : {};
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  return [...keys]
    .filter((key) => canonicalJson(from[key]) !== canonicalJson(to[key]))
    .sort((a, b) => a.localeCompare(b));
}
