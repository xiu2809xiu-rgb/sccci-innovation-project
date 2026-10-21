import type { SampleEncoding } from '@huitong/shared';

/** What the bytes of a CSV file say about how its text is encoded. */
export type EncodingVerdict =
  | { kind: 'known'; encoding: SampleEncoding }
  | { kind: 'uncertain'; candidates: readonly SampleEncoding[] }
  | { kind: 'unsupported' };

const UTF8_BOM = [0xef, 0xbb, 0xbf];

/** Above this share of GB2312 characters, a file that is also valid UTF-8 could be either. */
const AMBIGUOUS_SHARE = 0.9;

/** Below this share, bytes that happen to be valid GB18030 are not trusted as Chinese text. */
const GBK_SHARE = 0.6;

/** The text, or null when the bytes are not valid in that encoding (never U+FFFD stand-ins). */
export function decodeStrict(bytes: Uint8Array, encoding: SampleEncoding): string | null {
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Of the two-byte characters in a GB18030 reading, the share inside the
 * GB2312 block (lead and trail bytes A1 to FE, leads up to F7), where
 * everyday Chinese text lives. GBK text scores close to 1; UTF-8 or Latin
 * bytes read as GB18030 score far lower. Four-byte sequences are skipped.
 */
export function gb2312Share(bytes: Uint8Array): number {
  let pairs = 0;
  let inBlock = 0;
  for (let index = 0; index < bytes.length;) {
    const lead = bytes[index] ?? 0;
    if (lead < 0x80) {
      index += 1;
      continue;
    }
    const trail = bytes[index + 1] ?? 0;
    if (trail >= 0x30 && trail <= 0x39) {
      index += 4;
      continue;
    }
    pairs += 1;
    if (lead >= 0xa1 && lead <= 0xf7 && trail >= 0xa1 && trail <= 0xfe) inBlock += 1;
    index += 2;
  }
  return pairs === 0 ? 0 : inBlock / pairs;
}

/**
 * Works out a CSV file's encoding from its bytes. A byte-order mark or plain
 * ASCII means UTF-8. Otherwise the file is decoded strictly both ways: valid
 * in only one encoding settles it, unless GB18030 is the only fit and the
 * text does not look Chinese (a Latin-1 export), which is unsupported. Valid
 * in both, with Chinese-looking GB18030 text, is uncertain: HR chooses.
 */
export function detectEncoding(bytes: Uint8Array): EncodingVerdict {
  if (UTF8_BOM.every((byte, index) => bytes[index] === byte)) {
    return { kind: 'known', encoding: 'utf-8' };
  }
  if (bytes.every((byte) => byte < 0x80)) return { kind: 'known', encoding: 'utf-8' };

  const utf8 = decodeStrict(bytes, 'utf-8') !== null;
  const share = decodeStrict(bytes, 'gb18030') === null ? null : gb2312Share(bytes);
  if (utf8) {
    return share !== null && share >= AMBIGUOUS_SHARE
      ? { kind: 'uncertain', candidates: ['gb18030', 'utf-8'] }
      : { kind: 'known', encoding: 'utf-8' };
  }
  return share !== null && share >= GBK_SHARE
    ? { kind: 'known', encoding: 'gb18030' }
    : { kind: 'unsupported' };
}
