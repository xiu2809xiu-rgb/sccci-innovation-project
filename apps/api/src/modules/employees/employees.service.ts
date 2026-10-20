import { Injectable } from '@nestjs/common';
import {
  EMPLOYEE_FIELDS,
  IDENTITY_FIELDS,
  type EmployeeDetail,
  type EmployeeField,
  type EmployeeListQuery,
  type EmployeeSummary,
  type EntityCode,
  type SourceOfTruth,
} from '@huitong/shared';

import { NotFoundError } from '../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { FieldMasker } from '../access/field-masker.js';
import { conflictView } from './conflict.view.js';
import { sameValue } from './domain/field-merger.js';
import { canonicalOf } from './employee-record.js';
import { EmployeesRepository } from './employees.repository.js';

const SHOWN_FIELDS = EMPLOYEE_FIELDS.filter(
  (field) => !(IDENTITY_FIELDS as readonly string[]).includes(field),
);

/**
 * Reads of the employee master for the Employees page. The list carries
 * INTERNAL fields only; the record drawer masks every value it shows, the
 * master's and each source's, for the viewer's role and the record's entity.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly employees: EmployeesRepository,
    private readonly masker: FieldMasker,
  ) {}

  async list(query: EmployeeListQuery): Promise<{ items: EmployeeSummary[]; total: number }> {
    const { items, total } = await this.employees.list(query);
    return {
      total,
      items: items.map((row) => ({
        employeeNo: row.employeeNo,
        entityCode: row.entityCode as EntityCode,
        fullNameLatin: row.fullNameLatin,
        fullNameLocal: row.fullNameLocal,
        preferredName: row.preferredName,
        workEmail: row.workEmail,
        departmentCode: row.departmentCode as EmployeeSummary['departmentCode'],
        jobTitle: row.jobTitle,
        jobTitleZh: row.jobTitleZh,
        employmentStatus: row.employmentStatus,
        workLocation: row.workLocation as EmployeeSummary['workLocation'],
        openConflictCount: row._count.conflicts,
        sources: [...new Set(row.sourceRecords.map((record) => record.connectorId))].sort(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async detail(employeeNo: string, viewer: AuthenticatedUser): Promise<EmployeeDetail> {
    const row = await this.employees.findDetail(employeeNo);
    if (!row) throw new NotFoundError(`Employee ${employeeNo}`);
    const entity = row.entityCode as EntityCode;
    const policies = await this.employees.sourcePolicies(entity);
    const master = canonicalOf(row);
    const openConflicts = row.conflicts.filter((conflict) => conflict.status === 'OPEN');
    const actorIds = [
      ...new Set([
        ...row.changes.flatMap((change) => (change.actorUserId ? [change.actorUserId] : [])),
        ...row.conflicts.flatMap((conflict) =>
          conflict.resolvedByUserId ? [conflict.resolvedByUserId] : [],
        ),
      ]),
    ];
    const names = new Map(
      (actorIds.length > 0 ? await this.employees.displayNames(actorIds) : []).map((person) => [
        person.id,
        person.displayName,
      ]),
    );
    const show = (field: string, value: unknown) => this.masker.value(field, value, viewer, entity);

    return {
      employeeNo: row.employeeNo,
      entityCode: entity,
      fullNameLatin: row.fullNameLatin,
      fullNameLocal: row.fullNameLocal,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      fields: SHOWN_FIELDS.map((field) => {
        const rows = row.provenance.filter((provenance) => provenance.field === field);
        const chosen = rows.find((provenance) => provenance.isSourceOfTruth);
        const owner = policies.get(field) ?? null;
        const sourceOfTruth: SourceOfTruth = chosen
          ? { kind: 'HR_DECISION', connectorId: chosen.connectorId }
          : owner
            ? { kind: 'POLICY', connectorId: owner }
            : { kind: 'NONE', connectorId: null };
        return {
          field,
          classification: this.masker.classification(field),
          value: show(field, master[field]),
          sourceOfTruth,
          sources: rows
            .sort((a, b) => a.connectorId.localeCompare(b.connectorId))
            .map((provenance) => ({
              connectorId: provenance.connectorId,
              value: show(field, provenance.value),
              observedAt: provenance.observedAt.toISOString(),
              agrees: sameValue(provenance.value, master[field]),
            })),
          openConflictId: openConflicts.find((conflict) => conflict.field === field)?.id ?? null,
        };
      }),
      conflicts: row.conflicts.map((conflict) =>
        conflictView(conflict, row, viewer, this.masker, names),
      ),
      history: row.changes.map((change) => ({
        id: change.id,
        field: change.field as EmployeeField,
        oldValue: show(change.field, change.oldValue),
        newValue: show(change.field, change.newValue),
        source: change.source,
        connectorId: change.connectorId,
        syncRunId: change.syncRunId,
        actor: change.actorUserId
          ? { id: change.actorUserId, displayName: names.get(change.actorUserId) ?? '' }
          : null,
        createdAt: change.createdAt.toISOString(),
      })),
    };
  }
}
