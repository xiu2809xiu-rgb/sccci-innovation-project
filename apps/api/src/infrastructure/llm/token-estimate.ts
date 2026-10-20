/** Han characters (Chinese ideographs) count as one token each. */
const HAN = /\p{Script=Han}/gu;

/**
 * Rough token count for providers that report none (the mock): about four
 * characters per token for Latin text and one token per Chinese character.
 */
export function estimateTokens(text: string): number {
  const han = text.match(HAN)?.length ?? 0;
  const other = text.length - han;
  return han + Math.ceil(other / 4);
}
