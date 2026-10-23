import type { ProhibitedKind } from '@huitong/shared';

/**
 * Data HuiTong must never store: national ID numbers (NRIC/FIN, MyKad, PRC
 * resident ID, passports; CLAUDE.md data rules) and gender (ADR 0011). A column
 * is prohibited when its header names one, or, for national IDs, when most of
 * its values have the shape of one. It is then withheld from the model and
 * never mapped, whatever the AI or a reviewer suggests.
 */
const NATIONAL_ID_HEADERS: readonly RegExp[] = [
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

/** Gender is decided by header only: values such as M and F mean too many other things. */
const GENDER_HEADERS: readonly RegExp[] = [/\bgender\b/i, /\bsex\b/i, /\bjantina\b/i, /性别/];

const SG_NRIC = /^[STFGM]\d{7}[A-Z]$/i; // Singapore NRIC / FIN
const MY_MYKAD = /^\d{6}-?\d{2}-?\d{4}$/; // Malaysian MyKad
const CN_RESIDENT_ID = /^\d{17}[\dX]$/i; // PRC resident identity card

export interface ProhibitedCheck {
  prohibited: boolean;
  kind: ProhibitedKind | null;
  reason: 'HEADER' | 'VALUES' | null;
}

/**
 * Whether one cell has the shape of a national ID number. In a phone column
 * the MyKad shape is left out: a Malaysian number with its country code has
 * the same twelve digits.
 */
export function looksLikeNationalId(value: unknown, { phone = false } = {}): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const text = String(value).trim();
  return SG_NRIC.test(text) || CN_RESIDENT_ID.test(text) || (!phone && MY_MYKAD.test(text));
}

export function checkProhibited(
  header: string,
  values: readonly unknown[],
  { phone = false } = {},
): ProhibitedCheck {
  if (NATIONAL_ID_HEADERS.some((pattern) => pattern.test(header)))
    return { prohibited: true, kind: 'NATIONAL_ID', reason: 'HEADER' };
  if (GENDER_HEADERS.some((pattern) => pattern.test(header)))
    return { prohibited: true, kind: 'GENDER', reason: 'HEADER' };
  const texts = values.filter(
    (value): value is string | number => typeof value === 'string' || typeof value === 'number',
  );
  const matching = texts.filter((text) => looksLikeNationalId(text, { phone })).length;
  if (texts.length > 0 && matching / texts.length >= 0.5)
    return { prohibited: true, kind: 'NATIONAL_ID', reason: 'VALUES' };
  return { prohibited: false, kind: null, reason: null };
}
