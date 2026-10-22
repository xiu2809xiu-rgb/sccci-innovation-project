import { Injectable } from '@nestjs/common';
import {
  canonicalEmployeeSchema,
  REALTIME_EVENTS,
  type Conflict,
  type ConflictEvent,
  type ConflictExplanation,
  type ConflictListQuery,
  type EmployeeField,
  type EntityCode,
  type Locale,
  type ResolveConflictRequest,
} from '@huitong/shared';

import {
  ConflictError,
  NotFoundError,
  ValidationFailedError,
} from '../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { RealtimeService } from '../../infrastructure/events/realtime.service.js';
import { FieldMasker } from '../access/field-masker.js';
import { DiscrepancyExplainer } from '../ai/discrepancy/discrepancy-explainer.js';
import { conflictView } from './conflict.view.js';
import { sameValue } from './domain/field-merger.js';
import { canonicalOf, columnsOf } from './employee-record.js';
import { ConflictsRepository } from './conflicts.repository.js';
import { EmployeesRepository } from './employees.repository.js';
import { explainerRequest } from './explainer-request.js';
import { sourceChangedAt } from './source-timestamps.js';

type SignedIn = RequestMeta & { actor: AuthenticatedUser };

/**
 * Conflicts between sources: HR lists them, asks the AI explainer for
 * context, and resolves each one by choosing a source or typing the right
 * value. The decision, the master change and the history line commit
 * together, and the decision is audited.
 */
@Injectable()
export class ConflictsService {
  constructor(
    private readonly conflicts: ConflictsRepository,
    private readonly employees: EmployeesRepository,
    private readonly masker: FieldMasker,
    private readonly explainer: DiscrepancyExplainer,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(
    query: ConflictListQuery,
    viewer: AuthenticatedUser,
  ): Promise<{ items: Conflict[]; total: number }> {
    const { items, total } = await this.conflicts.list(query, this.masker.visibleScopes(viewer));
    const names = await this.names(
      items.flatMap((conflict) => (conflict.resolvedByUserId ? [conflict.resolvedByUserId] : [])),
    );
    return {
      items: items.map((conflict) =>
        conflictView(conflict, conflict.employee, viewer, this.masker, names),
      ),
      total,
    };
  }

  async resolve(id: string, request: ResolveConflictRequest, meta: SignedIn): Promise<Conflict> {
    const conflict = await this.visibleForResolution(id, meta.actor);
    if (conflict.status !== 'OPEN')
      throw new ConflictError('This conflict has already been settled');
    const field = conflict.field as EmployeeField;
    const { employee } = conflict;

    let value: unknown;
    let chosenConnectorId: string | null = null;
    if (request.resolution === 'SOURCE_SELECTED') {
      const held = employee.provenance.find(
        (row) => row.field === field && row.connectorId === request.connectorId,
      );
      if (!held) {
        throw new ValidationFailedError([
          { path: 'connectorId', message: 'That source holds no value for this field' },
        ]);
      }
      value = held.value;
      chosenConnectorId = request.connectorId;
    } else {
      const parsed = canonicalEmployeeSchema.shape[field].safeParse(request.value);
      if (!parsed.success) {
        throw new ValidationFailedError(
          parsed.error.issues.map((issue) => ({ path: 'value', message: issue.message })),
        );
      }
      value = parsed.data;
    }

    const current = canonicalOf(employee)[field];
    await this.employees.transaction(async (tx) => {
      const resolved = await this.conflicts.resolve(tx, id, {
        resolution: request.resolution,
        chosenConnectorId,
        resolvedValue: value,
        resolutionNote: request.note ?? null,
        resolvedByUserId: meta.actor.id,
      });
      if (!resolved) throw new ConflictError('This conflict has already been settled');
      if (!sameValue(current, value)) {
        await this.employees.updateEmployee(
          tx,
          employee.id,
          employee.version,
          columnsOf({ [field]: value }),
        );
        await this.employees.recordChanges(
          tx,
          employee.id,
          [{ field, oldValue: current, newValue: value }],
          {
            source: 'CONFLICT_RESOLUTION',
            connectorId: chosenConnectorId,
            syncRunId: null,
            actorUserId: meta.actor.id,
          },
        );
      }
      // Choosing a source makes it this record's truth for the field; a typed value clears any earlier choice.
      await this.employees.chooseSource(tx, employee.id, field, chosenConnectorId);
      await this.audit.record(
        {
          action: 'conflict.resolved',
          entityType: 'Conflict',
          entityId: id,
          metadata: {
            employeeNo: employee.employeeNo,
            field,
            resolution: request.resolution,
            connectorId: chosenConnectorId,
            note: request.note ?? null,
          },
        },
        meta,
        tx,
      );
    });
    const event: ConflictEvent = { conflictId: id, employeeNo: employee.employeeNo, field };
    this.realtime.publish(REALTIME_EVENTS.conflictResolved, event);

    const updated = await this.conflicts.findById(id);
    if (!updated) throw new NotFoundError(`Conflict ${id}`);
    return conflictView(
      updated,
      updated.employee,
      meta.actor,
      this.masker,
      await this.names([meta.actor.id]),
    );
  }

  /** The AI explainer's account of a conflict, built by `explainerRequest` (no identifiers, nothing above INTERNAL). */
  async explain(id: string, language: Locale, meta: SignedIn): Promise<ConflictExplanation> {
    const conflict = await this.visibleForResolution(id, meta.actor);
    const field = conflict.field as EmployeeField;
    const { employee } = conflict;
    const candidates = Array.isArray(conflict.candidates)
      ? (conflict.candidates as { connectorId: string; value: unknown }[])
      : [];
    const systems = new Map(
      (
        await this.conflicts.connectorNames(candidates.map((candidate) => candidate.connectorId))
      ).map((connector) => [
        connector.id,
        language === 'zh-CN' ? connector.nameZh : connector.name,
      ]),
    );
    const changed = new Map(
      employee.sourceRecords.map((record) => [record.connectorId, sourceChangedAt(record.payload)]),
    );

    const result = await this.explainer.explain(
      explainerRequest({
        language,
        entityCode: employee.entityCode as EntityCode,
        field,
        classification: this.masker.classification(field),
        visibleToViewer: this.masker.canSee(field, meta.actor, employee.entityCode as EntityCode),
        candidates,
        systems,
        changedAt: changed,
      }),
      { userId: meta.actor.id, requestId: meta.traceId },
    );
    return {
      conflictId: id,
      language,
      text: result.text,
      provider: result.provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
    };
  }

  /** The conflict, when its employee's entity is one the viewer may see; otherwise it reads as missing. */
  /**
   * The conflict, if the viewer may see both its employee and its field; otherwise not found, so
   * that a conflict about a hidden field cannot be resolved, explained or even confirmed to exist.
   */
  private async visibleForResolution(id: string, viewer: AuthenticatedUser) {
    const conflict = await this.conflicts.findForResolution(id);
    const entity = conflict?.employee.entityCode as EntityCode | undefined;
    if (
      !conflict ||
      !entity ||
      !this.masker.canList(viewer, entity) ||
      !this.masker.canSee(conflict.field, viewer, entity)
    ) {
      throw new NotFoundError(`Conflict ${id}`);
    }
    return conflict;
  }

  private async names(userIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    return new Map(
      (await this.conflicts.displayNames(unique)).map((person) => [person.id, person.displayName]),
    );
  }
}
