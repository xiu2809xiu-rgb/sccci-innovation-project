import { Unzip, UnzipInflate } from 'fflate';

/**
 * The archive is fed to the unpacker this much at a time. Deflate expands at
 * most about 1,000 times, so counting stops within a few megabytes of the limit.
 */
const CHUNK_BYTES = 4 * 1024;

/**
 * How many bytes a zip archive really unpacks to, counted while it inflates:
 * the sizes the archive declares are not trusted, and the unpacked bytes are
 * discarded as they are counted. Counting stops once it passes `limit`, so a
 * small upload cannot expand into gigabytes. Null when no entry can be read,
 * the archive is broken, or an entry uses a method other than store or deflate.
 */
export function inflatedBytes(archive: Uint8Array, limit: number): number | null {
  // Filled in by the unpacker's callbacks as it goes.
  const count = { bytes: 0, entries: 0, broken: false };
  const unzip = new Unzip((file) => {
    count.entries += 1;
    file.ondata = (error, chunk) => {
      if (error) count.broken = true;
      else count.bytes += chunk.length;
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let at = 0; at < archive.length; at += CHUNK_BYTES) {
      unzip.push(archive.subarray(at, at + CHUNK_BYTES), at + CHUNK_BYTES >= archive.length);
      if (count.bytes > limit || count.broken) break;
    }
  } catch {
    return null;
  }
  return count.broken || count.entries === 0 ? null : count.bytes;
}
