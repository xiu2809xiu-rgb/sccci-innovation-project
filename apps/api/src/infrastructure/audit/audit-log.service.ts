import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { RequestMeta } from '../../common/http/request-meta.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { canonicalJson, toJsonValue } from './canonical-json.js';

/** What happened, to what. Who and from where comes from {@link RequestMeta}. */
export interface AuditEventInput {
  /** Dotted verb, e.g. `conflict.resolved` or `auth.login.succeeded`. */
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ChainVerification {
  valid: boolean;
  checked: number;
  /** Id of the first event whose hash does not match, when the chain is broken. */
  firstBrokenId: string | null;
}

/** Serialises audit writes so two transactions never chain onto the same predecessor. */
const AUDIT_LOCK_KEY = 4207;

/**
 * Append-only audit writer. Every event stores the previous event's hash and
 * its own hash over both, so editing or deleting history breaks the chain; the
 * database trigger additionally refuses UPDATE, DELETE and TRUNCATE.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records one event. Pass the caller's transaction client so the business
   * write and its audit event commit or roll back together.
   */
  async record(
    input: AuditEventInput,
    meta: RequestMeta | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) {
      await this.append(tx, input, meta);
      return;
    }
    await this.prisma.$transaction((client) => this.append(client, input, meta));
  }

  /** Recomputes every hash in order; used by the audit viewer and the tests. */
  async verifyChain(): Promise<ChainVerification> {
    const events = await this.prisma.auditEvent.findMany({ orderBy: { id: 'asc' } });
    let previous: string | null = null;
    for (const event of events) {
      const expected = AuditLogService.hash(previous, {
        occurredAt: event.occurredAt.toISOString(),
        actorUserId: event.actorUserId,
        actorRole: event.actorRole,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        before: event.before,
        after: event.after,
        metadata: event.metadata,
        traceId: event.traceId,
      });
      if (event.prevHash !== previous || event.hash !== expected) {
        return { valid: false, checked: events.length, firstBrokenId: event.id.toString() };
      }
      previous = event.hash;
    }
    return { valid: true, checked: events.length, firstBrokenId: null };
  }

  private async append(
    tx: Prisma.TransactionClient,
    input: AuditEventInput,
    meta: RequestMeta | null,
  ): Promise<void> {
    // Used as a table source: Prisma cannot deserialise the function's void result directly.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`;
    const last = await tx.auditEvent.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } });
    const prevHash = last?.hash ?? null;
    const content = {
      occurredAt: new Date().toISOString(),
      actorUserId: meta?.actor?.id ?? null,
      actorRole: meta?.actor?.role ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: toJsonValue(input.before) ?? null,
      after: toJsonValue(input.after) ?? null,
      metadata: toJsonValue(input.metadata) ?? null,
      traceId: meta?.traceId ?? null,
    };
    await tx.auditEvent.create({
      data: {
        ...content,
        occurredAt: new Date(content.occurredAt),
        before: content.before === null ? Prisma.DbNull : (content.before as Prisma.InputJsonValue),
        after: content.after === null ? Prisma.DbNull : (content.after as Prisma.InputJsonValue),
        metadata:
          content.metadata === null ? Prisma.DbNull : (content.metadata as Prisma.InputJsonValue),
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
        prevHash,
        hash: AuditLogService.hash(prevHash, content),
      },
    });
  }

  private static hash(prevHash: string | null, content: Record<string, unknown>): string {
    return createHash('sha256')
      .update(`${prevHash ?? 'GENESIS'}|${canonicalJson(content)}`)
      .digest('hex');
  }
}
