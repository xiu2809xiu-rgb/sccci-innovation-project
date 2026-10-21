import { Injectable } from '@nestjs/common';
import type { EmployeeListQuery } from '@huitong/shared';

import { ConflictError } from '../../common/errors/app-error.js';
import { toJsonValue } from '../../infrastructure/audit/canonical-json.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Observation } from './domain/field-merger.js';

type Tx = Prisma.TransactionClient;

/** A JSON column value: database NULL for "no value". */
export function jsonColumn(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const json = toJsonValue(value);
  return json ?? Prisma.DbNull;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * The order behind each sort the list offers. A switch rather than a lookup
 * table: the sort comes from the request, and a lookup could reach a method
 * of Object.prototype if validation ever slipped.
 */
function orderBy(
  sort: EmployeeListQuery['sort'],
  direction: Prisma.SortOrder,
): Prisma.EmployeeOrderByWithRelationInput[] {
  switch (sort) {
    case 'name':
      return [{ fullNameLatin: direction }, { employeeNo: 'asc' }];
    case 'employeeNo':
      return [{ employeeNo: direction }];
    case 'department':
      return [{ departmentCode: direction }, { fullNameLatin: 'asc' }];
    case 'hireDate':
      return [{ hireDate: direction }, { employeeNo: 'asc' }];
  }
}

/**
 * The employee master's data access: the merge reads and writes used by syncs
 * and conflict resolution, and the reads behind the Employees page. Writes take
 * the caller's transaction so a master change, its provenance, its conflicts
 * and its audit events commit together.
 */
@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, { timeout: 20_000 });
  }

  async sourceRecordHash(connectorId: string, externalId: string): Promise<string | null> {
    const record = await this.prisma.sourceRecord.findUnique({
      where: { connectorId_externalId: { connectorId, externalId } },
      select: { payloadHash: true },
    });
    return record?.payloadHash ?? null;
  }

  /** Field owners for an entity: connector id, or null where no single source owns the field. */
  async sourcePolicies(entityCode: string): Promise<Map<string, string | null>> {
    const rows = await this.prisma.fieldSourcePolicy.findMany({ where: { entityCode } });
    return new Map(rows.map((row) => [row.field, row.connectorId]));
  }

  /**
   * The identity details of every employee, in employee-number order, for a
   * sync preview to compare new records with. Names are compared after
   * normalising them, which an index cannot do, so the whole set is read
   * once per preview rather than queried per record.
   */
  identityFacts() {
    return this.prisma.employee.findMany({
      select: {
        employeeNo: true,
        entityCode: true,
        familyName: true,
        givenName: true,
        fullNameLatin: true,
        fullNameLocal: true,
        workEmail: true,
      },
      orderBy: { employeeNo: 'asc' },
    });
  }

  /** The other employee who already has this work email, as stored or in lower case (the unique key). */
  async workEmailHolder(workEmail: string, exceptEmployeeNo: string): Promise<string | null> {
    const holder = await this.prisma.employee.findFirst({
      where: {
        employeeNo: { not: exceptEmployeeNo },
        workEmail: { in: [...new Set([workEmail, workEmail.toLowerCase()])] },
      },
      select: { employeeNo: true },
    });
    return holder?.employeeNo ?? null;
  }

  /** The record with everything a merge needs: provenance, open conflicts and HR's typed-in decisions. */
  findForMerge(employeeNo: string, tx: Tx | PrismaService = this.prisma) {
    return tx.employee.findUnique({
      where: { employeeNo },
      include: {
        provenance: true,
        conflicts: {
          where: { OR: [{ status: 'OPEN' }, { status: 'RESOLVED', resolution: 'MANUAL_VALUE' }] },
          orderBy: { resolvedAt: 'desc' },
        },
      },
    });
  }

  createEmployee(tx: Tx, data: Prisma.EmployeeUncheckedCreateInput) {
    return tx.employee.create({ data });
  }

  /** Optimistic concurrency: fails if someone changed the record since it was read. */
  async updateEmployee(
    tx: Tx,
    id: string,
    version: number,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<void> {
    const { count } = await tx.employee.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0)
      throw new ConflictError('The employee record changed while it was being updated');
  }

  async upsertProvenance(
    tx: Tx,
    employeeId: string,
    field: string,
    observation: Observation,
  ): Promise<void> {
    const values = { value: jsonColumn(observation.value), observedAt: observation.observedAt };
    await tx.fieldProvenance.upsert({
      where: {
        employeeId_field_connectorId: { employeeId, field, connectorId: observation.connectorId },
      },
      create: { employeeId, field, connectorId: observation.connectorId, ...values },
      update: values,
    });
  }

  /** Marks the source HR chose as the record's truth for a field; null clears the choice. */
  async chooseSource(
    tx: Tx,
    employeeId: string,
    field: string,
    connectorId: string | null,
  ): Promise<void> {
    await tx.fieldProvenance.updateMany({
      where: { employeeId, field },
      data: { isSourceOfTruth: false },
    });
    if (connectorId !== null) {
      await tx.fieldProvenance.updateMany({
        where: { employeeId, field, connectorId },
        data: { isSourceOfTruth: true },
      });
    }
  }

  async recordChanges(
    tx: Tx,
    employeeId: string,
    changes: readonly FieldChange[],
    origin: Pick<
      Prisma.EmployeeChangeUncheckedCreateInput,
      'source' | 'connectorId' | 'syncRunId' | 'actorUserId'
    >,
  ): Promise<void> {
    if (changes.length === 0) return;
    await tx.employeeChange.createMany({
      data: changes.map((change) => ({
        employeeId,
        field: change.field,
        oldValue: jsonColumn(change.oldValue),
        newValue: jsonColumn(change.newValue),
        ...origin,
      })),
    });
  }

  openConflict(
    tx: Tx,
    employeeId: string,
    field: string,
    candidates: readonly Observation[],
    syncRunId: string | null,
  ) {
    return tx.conflict.create({
      data: {
        employeeId,
        field,
        openKey: `${employeeId}:${field}`,
        candidates: jsonColumn(candidates) as Prisma.InputJsonValue,
        detectedSyncRunId: syncRunId,
      },
    });
  }

  async refreshConflict(tx: Tx, id: string, candidates: readonly Observation[]): Promise<void> {
    await tx.conflict.update({
      where: { id },
      data: { candidates: jsonColumn(candidates) as Prisma.InputJsonValue },
    });
  }

  /** Closes a conflict the sources settled themselves (they agree again, or a source of truth now decides). */
  async dismissConflict(tx: Tx, id: string, note: string): Promise<void> {
    await tx.conflict.update({
      where: { id },
      data: { status: 'DISMISSED', openKey: null, resolutionNote: note, resolvedAt: new Date() },
    });
  }

  async saveSourceRecord(
    tx: Tx,
    record: {
      connectorId: string;
      externalId: string;
      employeeId: string;
      payload: unknown;
      payloadHash: string;
      syncRunId: string;
      fetchedAt: Date;
    },
  ): Promise<void> {
    const values = {
      employeeId: record.employeeId,
      payload: jsonColumn(record.payload) as Prisma.InputJsonValue,
      payloadHash: record.payloadHash,
      fetchedAt: record.fetchedAt,
      syncRunId: record.syncRunId,
    };
    await tx.sourceRecord.upsert({
      where: {
        connectorId_externalId: { connectorId: record.connectorId, externalId: record.externalId },
      },
      create: { connectorId: record.connectorId, externalId: record.externalId, ...values },
      update: values,
    });
  }

  count(): Promise<number> {
    return this.prisma.employee.count();
  }

  /** One page of the master, limited to the entities the viewer may list. */
  async list(query: EmployeeListQuery, entities: readonly string[]) {
    const q = query.q?.trim();
    const where: Prisma.EmployeeWhereInput = {
      entityCode: query.entityCode
        ? { in: entities.includes(query.entityCode) ? [query.entityCode] : [] }
        : { in: [...entities] },
      ...(query.departmentCode ? { departmentCode: query.departmentCode } : {}),
      ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
      ...(query.conflicts === 'open' ? { conflicts: { some: { status: 'OPEN' } } } : {}),
      ...(q
        ? {
            OR: [
              { employeeNo: { startsWith: q.toUpperCase() } },
              { fullNameLatin: { contains: q, mode: 'insensitive' } },
              { fullNameLocal: { contains: q } },
              { preferredName: { contains: q, mode: 'insensitive' } },
              { workEmail: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: orderBy(query.sort, query.direction),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: { select: { conflicts: { where: { status: 'OPEN' } } } },
          sourceRecords: { select: { connectorId: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, total };
  }

  /** Everything the record drawer shows. */
  findDetail(employeeNo: string) {
    return this.prisma.employee.findUnique({
      where: { employeeNo },
      include: {
        provenance: true,
        conflicts: { orderBy: { detectedAt: 'desc' }, take: 50 },
        changes: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
  }

  displayNames(userIds: readonly string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true },
    });
  }
}
