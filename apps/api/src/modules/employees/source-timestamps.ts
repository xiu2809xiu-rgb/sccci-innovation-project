/**
 * When a source last changed a record, from the vendor's own timestamp field:
 * SG HR's ISO `lastModified`, or China HQ's `最后修改时间` in China Standard
 * Time. A new adapter adds its field here. Used to tell which side of a
 * conflict changed more recently.
 */
export function sourceChangedAt(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const iso = record.lastModified;
  if (typeof iso === 'string' && !Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString();
  const cst = record['最后修改时间'];
  const match =
    typeof cst === 'string'
      ? /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(cst)
      : null;
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      `${year ?? ''}-${month ?? ''}-${day ?? ''}T${hour ?? ''}:${minute ?? ''}:${second ?? ''}+08:00`,
    ).toISOString();
  }
  return null;
}
