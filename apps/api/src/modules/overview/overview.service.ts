import { Injectable } from '@nestjs/common';
import {
  entityCodeSchema,
  LIVE_CONNECTOR_STATUSES,
  OVERVIEW_RECENT_RUNS,
  type ConnectorHealth,
  type Overview,
  type Permission,
} from '@huitong/shared';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { AccessPolicyService } from '../access/access-policy.service.js';
import { OverviewRepository } from './overview.repository.js';

const RECENT_CONFLICTS = 5;
const RECENT_ACTIVITY = 10;

type ConnectorRow = Awaited<ReturnType<OverviewRepository['connectorsWithRecentRuns']>>[number];

/** A live connector is healthy when it is ACTIVE and its latest sync did not fail. */
function isHealthy(connector: ConnectorRow): boolean {
  const latest = connector.syncRuns[0];
  return connector.status === 'ACTIVE' && latest?.status !== 'FAILED';
}

function toConnectorHealth(connector: ConnectorRow): ConnectorHealth {
  return {
    id: connector.id,
    name: connector.name,
    nameZh: connector.nameZh,
    type: connector.type,
    status: connector.status,
    isMock: connector.isMock,
    region: connector.region,
    lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
    recentRuns: connector.syncRuns.map((run) => ({
      id: run.id,
      status: run.status,
      trigger: run.trigger,
      queuedAt: run.queuedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      conflictCount: run.conflictCount,
      errorCount: run.errorCount,
    })),
  };
}

/**
 * Builds the overview for one caller. Counts of work the caller's role cannot
 * act on are reported as null rather than hidden numbers (least privilege).
 */
@Injectable()
export class OverviewService {
  constructor(
    private readonly repository: OverviewRepository,
    private readonly access: AccessPolicyService,
  ) {}

  async overview(user: AuthenticatedUser): Promise<Overview> {
    const can = (permission: Permission) => this.access.hasPermission(user.role, permission);
    const [
      byEntity,
      conflictedEmployees,
      openConflicts,
      connectors,
      mappingProposals,
      crossBorderTransfers,
      workflowTasks,
      recentConflicts,
      events,
    ] = await Promise.all([
      this.repository.employeeCountsByEntity(),
      this.repository.conflictedEmployeeCount(),
      this.repository.openConflictCount(),
      this.repository.connectorsWithRecentRuns(OVERVIEW_RECENT_RUNS),
      can('mappings:approve') ? this.repository.pendingMappingProposalCount() : null,
      can('governance:manage') ? this.repository.pendingTransferCount() : null,
      can('workflows:tasks') ? this.repository.openTaskCountFor(user.role) : null,
      this.repository.recentOpenConflicts(RECENT_CONFLICTS),
      this.repository.recentBusinessEvents(RECENT_ACTIVITY),
    ]);

    const actorIds = [
      ...new Set(events.flatMap((event) => (event.actorUserId ? [event.actorUserId] : []))),
    ];
    const actors = new Map(
      (actorIds.length > 0 ? await this.repository.displayNames(actorIds) : []).map((actor) => [
        actor.id,
        actor.displayName,
      ]),
    );

    const totalEmployees = byEntity.reduce((sum, row) => sum + row._count._all, 0);
    const live = connectors.filter((connector) =>
      LIVE_CONNECTOR_STATUSES.includes(connector.status),
    );

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        employees: {
          total: totalEmployees,
          byEntity: byEntity.map((row) => ({
            entityCode: entityCodeSchema.parse(row.entityCode),
            count: row._count._all,
          })),
        },
        consistencyRate:
          totalEmployees === 0 ? null : (totalEmployees - conflictedEmployees) / totalEmployees,
        openConflicts,
        connectors: { healthy: live.filter(isHealthy).length, total: live.length },
      },
      connectors: connectors.map(toConnectorHealth),
      pendingApprovals: {
        mappingProposals,
        conflicts: can('conflicts:resolve') ? openConflicts : null,
        crossBorderTransfers,
        workflowTasks,
      },
      recentConflicts: recentConflicts.map((conflict) => ({
        id: conflict.id,
        employeeNo: conflict.employee.employeeNo,
        employeeName: conflict.employee.fullNameLatin,
        employeeNameLocal: conflict.employee.fullNameLocal,
        entityCode: entityCodeSchema.parse(conflict.employee.entityCode),
        field: conflict.field,
        detectedAt: conflict.detectedAt.toISOString(),
      })),
      activity: events.map((event) => ({
        id: event.id.toString(),
        occurredAt: event.occurredAt.toISOString(),
        action: event.action,
        actorName: event.actorUserId ? (actors.get(event.actorUserId) ?? null) : null,
        actorRole: event.actorRole,
        entityType: event.entityType,
        entityId: event.entityId,
      })),
    };
  }
}
