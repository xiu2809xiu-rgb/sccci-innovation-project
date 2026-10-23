import { Inject, Injectable } from '@nestjs/common';
import { STAGED_IMPORT_TTL_MINUTES, stagedImportSchema, type StagedImport } from '@huitong/shared';
import type { Redis } from 'ioredis';
import { z } from 'zod';

import { AppError } from '../../../common/errors/app-error.js';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.module.js';

const KEY_PREFIX = 'huitong:staged-import:';

/** A summary read waits this long for Redis, so connector pages never hang on it. */
const SUMMARY_TIMEOUT_MS = 2_000;

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);

const stagedCellSchema = z.union([
  z.string(),
  z.number(),
  z.null(),
  z.object({ $date: z.iso.datetime() }),
]);

const recordsSchema = z.array(
  z.object({ externalId: z.string().min(1), payload: z.record(z.string(), stagedCellSchema) }),
);

/** What is kept for a staged file: HR's summary, and the minimised rows the sync reads. */
const storedImportSchema = z.object({
  summary: stagedImportSchema,
  stagedByUserId: z.string(),
  sha256: sha256Schema,
  records: recordsSchema,
});

export type StoredImport = z.infer<typeof storedImportSchema>;

/** A staged file without its rows: enough to show it and to check what a sync would read. */
export interface StagedFile {
  summary: StagedImport;
  sha256: string;
}

/** Deletes the key only while it still holds the file the caller read. */
const DELETE_IF_SAME_FILE = `
if redis.call('HGET', KEYS[1], 'sha256') == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`;

/** Redis did not answer a summary read in time, so whether a file is staged is unknown. */
export class StagedImportUnavailableError extends AppError {
  constructor() {
    super(
      'SERVICE_UNAVAILABLE',
      'The staged files cannot be read right now; try again shortly',
      503,
    );
  }
}

function parseJson(raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * The files staged for import, one per file connector, kept in Redis only
 * until an apply imports them or they expire (STAGED_IMPORT_TTL_MINUTES).
 * They hold personal data, so nothing keeps them longer than the import needs.
 * Each is a hash, so pages read the small summary without the rows.
 */
@Injectable()
export class StagedImportStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async put(stored: StoredImport): Promise<void> {
    const key = KEY_PREFIX + stored.summary.connectorId;
    await this.redis
      .multi()
      .del(key)
      .hset(key, {
        summary: JSON.stringify(stored.summary),
        stagedByUserId: stored.stagedByUserId,
        sha256: stored.sha256,
        records: JSON.stringify(stored.records),
      })
      .expire(key, STAGED_IMPORT_TTL_MINUTES * 60)
      .exec();
  }

  /**
   * The connector's staged file without its rows, or null when there is none,
   * it expired, or it no longer reads back. Throws StagedImportUnavailableError
   * when Redis does not answer in time.
   */
  async summary(connectorId: string): Promise<StagedFile | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new StagedImportUnavailableError());
      }, SUMMARY_TIMEOUT_MS);
    });
    try {
      const [summary, sha256] = await Promise.race([
        this.redis.hmget(KEY_PREFIX + connectorId, 'summary', 'sha256'),
        timeout,
      ]);
      const parsed = z
        .object({ summary: stagedImportSchema, sha256: sha256Schema })
        .safeParse({ summary: parseJson(summary), sha256 });
      return parsed.success ? parsed.data : null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** The connector's staged file with its rows, or null when there is none (or it expired). */
  async get(connectorId: string): Promise<StoredImport | null> {
    const fields = await this.redis.hgetall(KEY_PREFIX + connectorId);
    if (Object.keys(fields).length === 0) return null;
    const parsed = storedImportSchema.safeParse({
      summary: parseJson(fields.summary),
      stagedByUserId: fields.stagedByUserId,
      sha256: fields.sha256,
      records: parseJson(fields.records),
    });
    // Staged but unreadable is a fault, not a missing file: HR would be told to stage it again.
    if (!parsed.success) throw new Error(`The file staged for ${connectorId} no longer reads back`);
    return parsed.data;
  }

  /** Deletes the connector's staged file; true when there was one. */
  async delete(connectorId: string): Promise<boolean> {
    return (await this.redis.del(KEY_PREFIX + connectorId)) > 0;
  }

  /**
   * Deletes the staged file only if it is still the one with this SHA-256, in
   * one step, so a file staged while a sync ran is never deleted in its place.
   */
  async deleteIfSame(connectorId: string, sha256: string): Promise<boolean> {
    const deleted = await this.redis.eval(DELETE_IF_SAME_FILE, 1, KEY_PREFIX + connectorId, sha256);
    return deleted === 1;
  }
}
