export type QueryValue = string | number | boolean | null | undefined;

/** `?a=1&b=x` from the defined values, in key order; an empty string when none are set. */
export function toQueryString(params: Readonly<Record<string, QueryValue>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}
