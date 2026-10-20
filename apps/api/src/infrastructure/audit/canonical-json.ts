/**
 * JSON with object keys sorted at every level, so the same content always
 * produces the same string (and therefore the same hash).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  // Decimal and similar types serialise themselves; keep their own JSON form.
  const withToJson = value as { toJSON?: () => unknown };
  if (typeof withToJson.toJSON === 'function') {
    return sortKeys(withToJson.toJSON());
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, sortKeys(item)]),
  );
}

/** A plain JSON copy (dates as ISO strings, undefined dropped) for JSON columns. */
export function toJsonValue(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(canonicalJson(value));
}
