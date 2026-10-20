import { Injectable } from '@nestjs/common';
import {
  canonicalEmployeeSchema,
  DEPARTMENTS,
  isWithinClearance,
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
import { FIELD_WORDS } from '../ai/schema-mapping/field-vocabulary.js';
import { conflictView } from './conflict.view.js';
import { sameValue } from './domain/field-merger.js';
import { canonicalOf, columnsOf } from './employee-record.js';
import { ConflictsRepository } from './conflicts.repository.js';
import { EmployeesRepository } from './employees.repository.js';
import { sourceChangedAt } from './source-timestamps.js';

type SignedIn = RequestMeta & { actor: AuthenticatedUser };

function label(field: EmployeeField, language: Locale): string {
  const target = field === 'baseSalary' ? 'baseSalary.amount' : field;
  return FIELD_WORDS.find((words) => words.target === target)?.label[language] ?? field;
}

/** A value as words for the explainer: department codes become their names. */
function spoken(field: EmployeeField, value: unknown, language: Locale): string {
  if (field === 'departmentCode') {
    const department = DEPARTMENTS.find((candidate) => candidate.code === value);
    if (department) return language === 'zh-CN' ? department.nameZh : department.nameEn;
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : JSON.stringify(value);
}

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
    const { items, total } = await this.conflicts.list(query);
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
    const conflict = await this.conflicts.findForResolution(id);
    if (!conflict) throw new NotFoundError(`Conflict ${id}`);
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

  /** The AI explainer's account of a conflict. Values above INTERNAL never reach the model. */
  async explain(id: string, language: Locale, meta: SignedIn): Promise<ConflictExplanation> {
    const conflict = await this.conflicts.findForResolution(id);
    if (!conflict) throw new NotFoundError(`Conflict ${id}`);
    const field = conflict.field as EmployeeField;
    const { employee } = conflict;
    const classification = this.masker.classification(field);
    const shareable = isWithinClearance(classification, 'INTERNAL');
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
      {
        language,
        employee: {
          name:
            language === 'zh-CN' && employee.fullNameLocal
              ? employee.fullNameLocal
              : employee.fullNameLatin,
          entityCode: employee.entityCode as EntityCode,
        },
        field: { label: label(field, language), classification },
        candidates: candidates.map((candidate) => ({
          system: systems.get(candidate.connectorId) ?? candidate.connectorId,
          value: shareable ? spoken(field, candidate.value, language) : null,
          changedAt: changed.get(candidate.connectorId) ?? null,
        })),
      },
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

  private async names(userIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    return new Map(
      (await this.conflicts.displayNames(unique)).map((person) => [person.id, person.displayName]),
    );
  }
}
