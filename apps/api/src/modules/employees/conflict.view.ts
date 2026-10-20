import type { Conflict, EmployeeField, EntityCode } from '@huitong/shared';

import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import type { Conflict as ConflictRow } from '../../generated/prisma/client.js';
import type { FieldMasker } from '../access/field-masker.js';

export interface ConflictEmployee {
  employeeNo: string;
  fullNameLatin: string;
  fullNameLocal: string | null;
  entityCode: string;
}

/** A conflict as the viewer may see it: every candidate value masked by the field's classification. */
export function conflictView(
  conflict: ConflictRow,
  employee: ConflictEmployee,
  viewer: AuthenticatedUser,
  masker: FieldMasker,
  names: ReadonlyMap<string, string>,
): Conflict {
  const entity = employee.entityCode as EntityCode;
  const candidates = Array.isArray(conflict.candidates)
    ? (conflict.candidates as { connectorId: string; value: unknown; observedAt: string }[])
    : [];
  return {
    id: conflict.id,
    employeeNo: employee.employeeNo,
    employeeName: employee.fullNameLatin,
    employeeNameLocal: employee.fullNameLocal,
    entityCode: entity,
    field: conflict.field as EmployeeField,
    classification: masker.classification(conflict.field),
    status: conflict.status,
    candidates: candidates.map((candidate) => ({
      connectorId: candidate.connectorId,
      value: masker.value(conflict.field, candidate.value, viewer, entity),
      observedAt: new Date(candidate.observedAt).toISOString(),
    })),
    detectedAt: conflict.detectedAt.toISOString(),
    resolution: conflict.resolution,
    chosenConnectorId: conflict.chosenConnectorId,
    resolvedValue: masker.value(conflict.field, conflict.resolvedValue, viewer, entity),
    resolutionNote: conflict.resolutionNote,
    resolvedBy: conflict.resolvedByUserId
      ? { id: conflict.resolvedByUserId, displayName: names.get(conflict.resolvedByUserId) ?? '' }
      : null,
    resolvedAt: conflict.resolvedAt?.toISOString() ?? null,
  };
}
