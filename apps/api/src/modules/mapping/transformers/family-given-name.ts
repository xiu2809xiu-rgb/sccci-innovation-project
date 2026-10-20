/** A name split from SAP's `FAMILY Given` form, in normal capitals. */
export interface FamilyGivenName {
  family: string;
  given: string;
}

const UPPER = /\p{Lu}/u;

function isUpperCaseWord(word: string): boolean {
  return UPPER.test(word) && word === word.toLocaleUpperCase('en');
}

function capitalise(word: string): string {
  return word
    .split('-')
    .map((part) => part.charAt(0).toLocaleUpperCase('en') + part.slice(1).toLocaleLowerCase('en'))
    .join('-');
}

/**
 * Splits `TAN Mei Ling` into family `Tan` and given `Mei Ling`: the leading
 * words in capitals are the family name. Null when there is no such word or
 * nothing after it.
 */
export function parseFamilyGiven(text: string): FamilyGivenName | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const familyWords: string[] = [];
  for (const word of words) {
    if (!isUpperCaseWord(word)) break;
    familyWords.push(word);
  }
  const givenWords = words.slice(familyWords.length);
  if (familyWords.length === 0 || givenWords.length === 0) return null;
  return { family: familyWords.map(capitalise).join(' '), given: givenWords.join(' ') };
}
