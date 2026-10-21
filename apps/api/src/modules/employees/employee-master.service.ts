import { Injectable } from '@nestjs/common';
import {
  IDENTITY_FIELDS,
  REQUIRED_EMPLOYEE_FIELDS,
  type CanonicalEmployeePartial,
  type EmployeeField,
  type EntityCode,
  type PossibleMatch,
  type SyncMode,
  type SyncPreviewItem,
} from '@huitong/shared';

import type { RequestMeta } from '../../common/http/request-meta.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { mergeField, sameValue, type Observation } from './domain/field-merger.js';
import { possibleMatchReasons, type IdentityFacts } from './domain/identity-matcher.js';
import { canonicalOf, columnsOf, createColumnsOf } from './employee-record.js';
import { EmployeesRepository, type FieldChange } from './employees.repository.js';

/** One validated record from a source, ready to merge into the master. */
export interface SourceRecordInput {
  connectorId: string;
  syncRunId: string;
  externalId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  values: CanonicalEmployeePartial;
  observedAt: Date;
}

export interface OpenedConflict {
  conflictId: string | null;
  employeeNo: string;
  field: EmployeeField;
}

export type MergeResult =
  | { kind: 'unchanged' }
  | { kind: 'rejected'; code: string; message: string }
  | {
      kind: 'created' | 'updated' | 'recorded';
      employeeNo: string;
      entityCode: EntityCode;
      changes: FieldChange[];
      conflicts: OpenedConflict[];
      preview: SyncPreviewItem[];
    };

type MergeTarget = NonNullable<Awaited<ReturnType<EmployeesRepository['findForMerge']>>>;

const isIdentity = (field: string) => (IDENTITY_FIELDS as readonly string[]).includes(field);

function asObservation(row: {
  connectorId: string;
  value: unknown;
  observedAt: Date | string;
}): Observation {
  return {
    connectorId: row.connectorId,
    value: row.value ?? null,
    observedAt: new Date(row.observedAt),
  };
}

/** The values a set of candidates holds, by source, ignoring when each was seen. */
function candidateKey(candidates: readonly Observation[]): unknown {
  return [...candidates]
    .sort((a, b) => a.connectorId.localeCompare(b.connectorId))
    .map((candidate) => [candidate.connectorId, candidate.value]);
}

/**
 * Merges source records into the canonical employee master: creates new
 * people, applies each field's source of truth, records provenance and opens
 * conflicts where sources disagree (see `mergeField`). PREVIEW computes the
 * same decisions without writing anything.
 */
@Injectable()
export class EmployeeMasterService {
  constructor(
    private readonly employees: EmployeesRepository,
    private readonly audit: AuditLogService,
  ) {}

  sourcePolicies(entityCode: string): Promise<Map<string, string | null>> {
    return this.employees.sourcePolicies(entityCode);
  }

  async merge(
    record: SourceRecordInput,
    mode: SyncMode,
    policies: (entityCode: string) => Promise<Map<string, string | null>>,
    meta: RequestMeta,
  ): Promise<MergeResult> {
    // Nothing new from this source since the last run: the second identical sync writes nothing.
    if (
      (await this.employees.sourceRecordHash(record.connectorId, record.externalId)) ===
      record.payloadHash
    ) {
      return { kind: 'unchanged' };
    }
    const { employeeNo } = record.values;
    if (!employeeNo) {
      return {
        kind: 'rejected',
        code: 'MISSING_EMPLOYEE_NO',
        message: 'The record has no employee number',
      };
    }
    const existing = await this.employees.findForMerge(employeeNo);
    return existing
      ? this.mergeInto(existing, record, mode, await policies(existing.entityCode), meta)
      : this.create(record, employeeNo, mode, meta);
  }

  private async create(
    record: SourceRecordInput,
    employeeNo: string,
    mode: SyncMode,
    meta: RequestMeta,
  ): Promise<MergeResult> {
    const { values } = record;
    const missing = REQUIRED_EMPLOYEE_FIELDS.filter((field) => (values[field] ?? null) === null);
    if (missing.length > 0 || !values.entityCode) {
      return {
        kind: 'rejected',
        code: 'INCOMPLETE_RECORD',
        message: `Cannot add ${employeeNo}: missing ${missing.join(', ')}`,
      };
    }
    const entityCode = values.entityCode;
    const possibleMatches = await this.possibleMatches(employeeNo, values);
    const preview: SyncPreviewItem[] = [
      {
        employeeNo,
        entityCode,
        kind: 'CREATE',
        field: null,
        before: null,
        after: null,
        ...(possibleMatches.length > 0 ? { possibleMatches } : {}),
      },
    ];
    const result = {
      kind: 'created' as const,
      employeeNo,
      entityCode,
      changes: [],
      conflicts: [],
      preview,
    };
    if (mode === 'PREVIEW') return result;

    await this.employees.transaction(async (tx) => {
      const employee = await this.employees.createEmployee(
        tx,
        createColumnsOf({ ...values, employeeNo }),
      );
      for (const [field, value] of Object.entries(values)) {
        if (isIdentity(field)) continue;
        await this.employees.upsertProvenance(tx, employee.id, field, {
          connectorId: record.connectorId,
          value,
          observedAt: record.observedAt,
        });
      }
      await this.saveSource(tx, record, employee.id);
      await this.audit.record(
        {
          action: 'employee.created',
          entityType: 'Employee',
          entityId: employeeNo,
          metadata: { connectorId: record.connectorId, syncRunId: record.syncRunId },
        },
        meta,
        tx,
      );
    });
    return result;
  }

  /**
   * Existing employees a new record may duplicate, for HR to check in the
   * preview. The record is still created on its own: a look-alike name or a
   * shared email never merges two people (story B-5).
   */
  private async possibleMatches(
    employeeNo: string,
    values: SourceRecordInput['values'],
  ): Promise<PossibleMatch[]> {
    const facts: IdentityFacts = {
      employeeNo,
      familyName: values.familyName ?? null,
      givenName: values.givenName ?? null,
      fullNameLatin: values.fullNameLatin ?? null,
      fullNameLocal: values.fullNameLocal ?? null,
      workEmail: values.workEmail ?? null,
    };
    const candidates = await this.employees.lookAlikeCandidates(facts);
    return candidates.flatMap((candidate) => {
      const reasons = possibleMatchReasons(facts, candidate);
      return reasons.length > 0
        ? [
            {
              employeeNo: candidate.employeeNo,
              entityCode: candidate.entityCode as EntityCode,
              reasons,
            },
          ]
        : [];
    });
  }

  private async mergeInto(
    existing: MergeTarget,
    record: SourceRecordInput,
    mode: SyncMode,
    policies: Map<string, string | null>,
    meta: RequestMeta,
  ): Promise<MergeResult> {
    const { employeeNo } = existing;
    const entityCode = existing.entityCode as EntityCode;
    if (record.values.entityCode && record.values.entityCode !== entityCode) {
      return {
        kind: 'rejected',
        code: 'ENTITY_MISMATCH',
        message: `${employeeNo} belongs to ${entityCode} in the master, not ${record.values.entityCode}`,
      };
    }
    const current = canonicalOf(existing);
    const provenance = existing.provenance.map((row) => ({
      ...row,
      observation: asObservation(row),
    }));
    const open = new Map(
      existing.conflicts.filter((c) => c.status === 'OPEN').map((c) => [c.field, c]),
    );
    const manual = new Map<string, (typeof existing.conflicts)[number]>();
    for (const conflict of existing.conflicts) {
      if (conflict.status === 'RESOLVED' && !manual.has(conflict.field))
        manual.set(conflict.field, conflict);
    }

    const changes: FieldChange[] = [];
    const provenanceWrites: { field: string; observation: Observation }[] = [];
    const toOpen: { field: EmployeeField; candidates: Observation[] }[] = [];
    const toRefresh: { id: string; candidates: Observation[] }[] = [];
    const toDismiss: string[] = [];

    for (const [name, value] of Object.entries(record.values)) {
      if (isIdentity(name)) continue;
      const field = name as EmployeeField;
      const rows = provenance.filter((row) => row.field === field);
      const mine: Observation = {
        connectorId: record.connectorId,
        value,
        observedAt: record.observedAt,
      };
      const previous = rows.find((row) => row.connectorId === record.connectorId);
      if (!previous || !sameValue(previous.observation.value, value))
        provenanceWrites.push({ field, observation: mine });

      const observations = [
        ...rows
          .filter((row) => row.connectorId !== record.connectorId)
          .map((row) => row.observation),
        mine,
      ];
      const decided = manual.get(field);
      const decision = mergeField({
        current: current[field],
        observations,
        policyOwner: policies.get(field) ?? null,
        chosenSource: rows.find((row) => row.isSourceOfTruth)?.connectorId ?? null,
        manualDecision: decided
          ? {
              value: decided.resolvedValue,
              overruled: (decided.candidates as { value: unknown }[]).map(
                (candidate) => candidate.value,
              ),
            }
          : null,
        hasOpenConflict: open.has(field),
      });

      if (decision.master.action === 'set') {
        changes.push({ field, oldValue: current[field], newValue: decision.master.value });
      }
      const existingConflict = open.get(field);
      if (decision.conflict.action === 'open') {
        const { candidates } = decision.conflict;
        if (!existingConflict) toOpen.push({ field, candidates });
        else if (
          !sameValue(
            candidateKey(existingConflict.candidates as unknown as Observation[]),
            candidateKey(candidates),
          )
        ) {
          toRefresh.push({ id: existingConflict.id, candidates });
        }
      } else if (decision.conflict.action === 'close' && existingConflict) {
        toDismiss.push(existingConflict.id);
      }
    }

    const preview: SyncPreviewItem[] = [
      ...changes.map((change) => ({
        employeeNo,
        entityCode,
        kind: 'UPDATE' as const,
        field: change.field,
        before: change.oldValue,
        after: change.newValue,
      })),
      ...toOpen.map((item) => ({
        employeeNo,
        entityCode,
        kind: 'CONFLICT' as const,
        field: item.field,
        before: current[item.field],
        after: item.candidates.map(({ connectorId, value }) => ({ connectorId, value })),
      })),
    ];
    const kind = changes.length > 0 ? 'updated' : 'recorded';
    const conflicts: OpenedConflict[] = toOpen.map((item) => ({
      conflictId: null,
      employeeNo,
      field: item.field,
    }));
    if (mode === 'PREVIEW') return { kind, employeeNo, entityCode, changes, conflicts, preview };

    await this.employees.transaction(async (tx) => {
      for (const write of provenanceWrites) {
        await this.employees.upsertProvenance(tx, existing.id, write.field, write.observation);
      }
      if (changes.length > 0) {
        await this.employees.updateEmployee(
          tx,
          existing.id,
          existing.version,
          columnsOf(Object.fromEntries(changes.map((change) => [change.field, change.newValue]))),
        );
        await this.employees.recordChanges(tx, existing.id, changes, {
          source: 'SYNC',
          connectorId: record.connectorId,
          syncRunId: record.syncRunId,
          actorUserId: meta.actor?.id ?? null,
        });
        // Field names only: the values live in employee_changes, which retention can purge.
        await this.audit.record(
          {
            action: 'employee.updated',
            entityType: 'Employee',
            entityId: employeeNo,
            metadata: {
              connectorId: record.connectorId,
              syncRunId: record.syncRunId,
              fields: changes.map((change) => change.field),
            },
          },
          meta,
          tx,
        );
      }
      for (const [index, item] of toOpen.entries()) {
        const conflict = await this.employees.openConflict(
          tx,
          existing.id,
          item.field,
          item.candidates,
          record.syncRunId,
        );
        const opened = conflicts[index];
        if (opened) opened.conflictId = conflict.id;
        await this.audit.record(
          {
            action: 'conflict.detected',
            entityType: 'Conflict',
            entityId: conflict.id,
            metadata: { employeeNo, field: item.field, syncRunId: record.syncRunId },
          },
          meta,
          tx,
        );
      }
      for (const item of toRefresh)
        await this.employees.refreshConflict(tx, item.id, item.candidates);
      for (const id of toDismiss)
        await this.employees.dismissConflict(
          tx,
          id,
          'The sources settled it: they agree, or a source of truth now decides',
        );
      await this.saveSource(tx, record, existing.id);
    });
    return { kind, employeeNo, entityCode, changes, conflicts, preview };
  }

  private saveSource(
    tx: Parameters<Parameters<EmployeesRepository['transaction']>[0]>[0],
    record: SourceRecordInput,
    employeeId: string,
  ): Promise<void> {
    return this.employees.saveSourceRecord(tx, {
      connectorId: record.connectorId,
      externalId: record.externalId,
      employeeId,
      payload: record.payload,
      payloadHash: record.payloadHash,
      syncRunId: record.syncRunId,
      fetchedAt: record.observedAt,
    });
  }
}
