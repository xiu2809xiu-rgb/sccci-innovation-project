/**
 * National ID numbers (NRIC/FIN, MyKad, PRC resident ID, passports) must never
 * be stored (CLAUDE.md data rules). A column is prohibited when its header
 * names one or when most of its values have the shape of one; it is then never
 * mapped, whatever the AI or a reviewer suggests.
 */
const HEADERS: readonly RegExp[] = [
  /\bnric\b/i,
  /\bfin\s*(no|number)?\b/i,
  /\bi\/?c\s*(no|number)?\b/i,
  /\bmykad\b/i,
  /\bno\.?\s*k\/?p\b/i,
  /\bpassport\b/i,
  /national\s*id/i,
  /identity\s*(card|no|number)/i,
  /身份证/,
  /证件号/,
  /护照/,
];

const VALUES: readonly RegExp[] = [
  /^[STFGM]\d{7}[A-Z]$/i, // Singapore NRIC / FIN
  /^\d{6}-?\d{2}-?\d{4}$/, // Malaysian MyKad
  /^\d{17}[\dX]$/i, // PRC resident identity card
];

export interface ProhibitedCheck {
  prohibited: boolean;
  reason: 'HEADER' | 'VALUES' | null;
}

export function checkProhibited(header: string, values: readonly unknown[]): ProhibitedCheck {
  if (HEADERS.some((pattern) => pattern.test(header)))
    return { prohibited: true, reason: 'HEADER' };
  const texts = values
    .filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number',
    )
    .map(String);
  const matching = texts.filter((text) =>
    VALUES.some((pattern) => pattern.test(text.trim())),
  ).length;
  if (texts.length > 0 && matching / texts.length >= 0.5)
    return { prohibited: true, reason: 'VALUES' };
  return { prohibited: false, reason: null };
}
