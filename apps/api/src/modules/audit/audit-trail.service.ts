import { Injectable } from '@nestjs/common';
import type { AuditEventQuery, AuditEventView, ChainVerificationView } from '@huitong/shared';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import type { Page } from '../../common/http/page.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { AuditTrailRepository } from './audit-trail.repository.js';
import { changedFields } from './changed-fields.js';

/**
 * The audit-log viewer's reads (area 4's F-2). Events show who did what to
 * which record and which fields changed, never the values. An event about an
 * employee of an entity the viewer may not list keeps its place in the log
 * but not the employee's number (default deny, as on the overview).
 */
@Injectable()
export class AuditTrailService {
  constructor(
    private readonly repository: AuditTrailRepository,
    private readonly auditLog: AuditLogService,
    private readonly access: AccessPolicyService,
  ) {}

  async events(query: AuditEventQuery, viewer: AuthenticatedUser): Promise<Page<AuditEventView>> {
    const listable: readonly string[] = this.access.listableEntities(viewer.homeEntityCode);
    if (query.entityId) {
      // Filtering on a withheld employee finds nothing, so the filter cannot probe for them.
      const entity = (await this.repository.entitiesOf([query.entityId])).get(query.entityId);
      if (entity !== undefined && !listable.includes(entity)) return { items: [], total: 0 };
    }

    const { items, total } = await this.repository.events(query);
    const [entities, names] = await Promise.all([
      this.repository.entitiesOf(
        items.flatMap((event) =>
          event.entityType === 'Employee' && event.entityId ? [event.entityId] : [],
        ),
      ),
      this.repository.displayNames([
        ...new Set(items.flatMap((event) => (event.actorUserId ? [event.actorUserId] : []))),
      ]),
    ]);

    return {
      items: items.map((event) => {
        const entity = event.entityId ? entities.get(event.entityId) : undefined;
        const withheld =
          event.entityType === 'Employee' &&
          event.entityId !== null &&
          (entity === undefined || !listable.includes(entity));
        return {
          id: event.id.toString(),
          occurredAt: event.occurredAt.toISOString(),
          action: event.action,
          actorUserId: event.actorUserId,
          actorName: event.actorUserId ? (names.get(event.actorUserId) ?? null) : null,
          actorRole: event.actorRole,
          entityType: event.entityType,
          entityId: withheld ? null : event.entityId,
          entityIdWithheld: withheld,
          changedFields: changedFields(event.before, event.after),
          traceId: event.traceId,
        };
      }),
      total,
    };
  }

  /** Recomputes every hash of the chain (story F-2); a broken link names the first bad event. */
  async verify(): Promise<ChainVerificationView> {
    const result = await this.auditLog.verifyChain();
    return { ...result, checkedAt: new Date().toISOString() };
  }
}
