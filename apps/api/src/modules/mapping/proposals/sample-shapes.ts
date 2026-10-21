/** How a column's values look, which is all the language model ever sees of them. */
export interface ColumnShape {
  header: string;
  /** e.g. `E######`, `##/##/#### (day first)`, `Aaa Aaa | Aaaa`, `text@domain`. */
  shape: string;
  /** The distinct values of a category column (department, status), when they are safe to show. */
  categories: string[] | null;
  filled: number;
}

const MAX_SHAPE = 200;
const MAX_CATEGORIES = 8;

/** Letters, digits and Chinese characters become placeholders; separators stay, so the layout shows. */
export function shapeOf(value: unknown): string {
  if (value instanceof Date) return 'date cell';
  if (typeof value === 'number') return Number.isInteger(value) ? 'whole number' : 'decimal number';
  if (typeof value === 'boolean') return 'yes/no';
  const text = String(value).trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) return 'text@domain';
  // One pass, so a placeholder is never itself replaced by a later rule.
  return text.slice(0, 40).replace(/[\p{L}\p{Nd}]/gu, (char) => {
    if (/\p{Script=Han}/u.test(char)) return '汉';
    if (/\p{Lu}/u.test(char)) return 'A';
    if (/\p{Ll}/u.test(char)) return 'a';
    return /\p{Nd}/u.test(char) ? '#' : 'x';
  });
}

/** For `##/##/####` dates: which part is the day, judged from the values (a part above 12 cannot be a month). */
function dateOrder(values: readonly string[]): string | null {
  const parts = values
    .map((value) => /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}$/.exec(value))
    .filter((match): match is RegExpExecArray => match !== null);
  if (parts.length === 0) return null;
  if (parts.some((match) => Number(match[1]) > 12)) return 'day first';
  if (parts.some((match) => Number(match[2]) > 12)) return 'month first';
  return 'day or month first';
}

/** An email address, an id or account number, or a phone number: never shown, even in a category column. */
function looksLikeAnIdentifier(value: string): boolean {
  return (
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ||
    /^[A-Za-z]{0,3}\d{5,}$/.test(value) ||
    (/^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7)
  );
}

/**
 * Describes one column without revealing its values. Category values are
 * shown only when the caller allows it for this header (departments, statuses,
 * locations) and the values repeat, which a column of names or ids would not.
 */
export function describeColumn(
  header: string,
  values: readonly unknown[],
  allowCategories: boolean,
): ColumnShape {
  const filled = values.filter((value) => value !== null && value !== undefined);
  const counts = new Map<string, number>();
  for (const value of filled) {
    const shape = shapeOf(value);
    counts.set(shape, (counts.get(shape) ?? 0) + 1);
  }
  const shapes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([shape]) => shape);
  const texts = filled.map((value) =>
    typeof value === 'string' ? value : String(value as number),
  );
  const order = dateOrder(texts);
  const shape = (
    filled.length === 0 ? 'empty' : shapes.join(' | ') + (order ? ` (${order})` : '')
  ).slice(0, MAX_SHAPE);

  const distinct = [...new Set(texts)];
  const categorical =
    allowCategories &&
    distinct.length > 0 &&
    distinct.length <= MAX_CATEGORIES &&
    distinct.length < filled.length &&
    distinct.every((value) => value.length <= 40 && !looksLikeAnIdentifier(value));
  return { header, shape, categories: categorical ? distinct.sort() : null, filled: filled.length };
}
