import type { PossibleMatchReason } from '@huitong/shared';

/** What the identity rule compares: the stable number, and the details that only hint at a match. */
export interface IdentityFacts {
  employeeNo: string;
  familyName: string | null;
  givenName: string | null;
  fullNameLatin: string | null;
  fullNameLocal: string | null;
  workEmail: string | null;
}

/** Letters only, without case or accents: "TAN Wei-Ming" and "Tan Weiming" become "tanweiming". */
function latinKey(name: string | null): string | null {
  if (!name) return null;
  const key = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return key === '' ? null : key;
}

/** The words of a name in a fixed order, so "Wei Ming Tan" and "Tan Wei Ming" agree. */
function nameParts(name: string | null): string | null {
  if (!name) return null;
  const parts = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  return parts.length > 1 ? parts.sort().join(' ') : null;
}

/** Without white space; an empty value counts as no value. */
function compact(value: string | null | undefined): string | null {
  const text = value?.replace(/\s/g, '') ?? '';
  return text.length > 0 ? text : null;
}

function same(a: string | null, b: string | null): boolean {
  return a !== null && a === b;
}

/**
 * A confirmed match: the same group employee number. Nothing else makes two
 * records one person; names, romanisations and emails only ever make a
 * possible match for HR to check (story B-5).
 */
export function isSamePerson(a: IdentityFacts, b: IdentityFacts): boolean {
  return a.employeeNo === b.employeeNo;
}

/**
 * Why `candidate` might be the same person as `existing`, for HR to check;
 * empty when nothing looks alike. A reason is never grounds to merge: two
 * people can share a Chinese name (陈伟), or a romanisation (陈伟 and 陈玮 are
 * both "Chen Wei"), and one person can be spelt several ways.
 */
export function possibleMatchReasons(
  candidate: IdentityFacts,
  existing: IdentityFacts,
): PossibleMatchReason[] {
  if (isSamePerson(candidate, existing)) return [];
  const reasons: PossibleMatchReason[] = [];

  if (same(compact(candidate.fullNameLocal), compact(existing.fullNameLocal))) {
    reasons.push('SAME_LOCAL_NAME');
  }

  const sameLatin =
    same(latinKey(candidate.fullNameLatin), latinKey(existing.fullNameLatin)) ||
    (same(latinKey(candidate.familyName), latinKey(existing.familyName)) &&
      same(latinKey(candidate.givenName), latinKey(existing.givenName)));
  const swapped =
    same(latinKey(candidate.familyName), latinKey(existing.givenName)) &&
    same(latinKey(candidate.givenName), latinKey(existing.familyName));
  if (sameLatin) {
    reasons.push('SAME_LATIN_NAME');
  } else if (
    swapped ||
    same(nameParts(candidate.fullNameLatin), nameParts(existing.fullNameLatin))
  ) {
    reasons.push('SAME_NAME_PARTS');
  }

  if (
    same(compact(candidate.workEmail?.toLowerCase()), compact(existing.workEmail?.toLowerCase()))
  ) {
    reasons.push('SAME_WORK_EMAIL');
  }
  return reasons;
}
