import type { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StagedImportStore, StagedImportUnavailableError } from './staged-import.store.js';

const storeOn = (redis: Partial<Record<'hmget' | 'hgetall', () => Promise<unknown>>>) =>
  new StagedImportStore(redis as unknown as Redis);

describe('StagedImportStore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up on a summary when Redis does not answer within two seconds', async () => {
    vi.useFakeTimers();
    const store = storeOn({ hmget: () => new Promise(() => undefined) });
    const read = store.summary('my-hr');
    const settled = expect(read).rejects.toBeInstanceOf(StagedImportUnavailableError);
    await vi.advanceTimersByTimeAsync(2_000);
    await settled;
  });

  it('reads no file as null, and a file that no longer reads back as a fault', async () => {
    await expect(storeOn({ hgetall: () => Promise.resolve({}) }).get('my-hr')).resolves.toBeNull();
    await expect(
      storeOn({ hgetall: () => Promise.resolve({ summary: '{', sha256: 'x' }) }).get('my-hr'),
    ).rejects.toThrow('The file staged for my-hr no longer reads back');
  });
});
