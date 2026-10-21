import {
  classificationRank,
  ENTITY_CODES,
  resolveClearance,
  type AccessMatrix,
  type ClassificationLevel,
  type ClearanceRule,
  type EntityCode,
  type Role,
} from '@huitong/shared';

/** The matrix's clearance as one list of rules, the shape `resolveClearance` takes. */
export function clearanceRulesOf(matrix: AccessMatrix): ClearanceRule[] {
  return matrix.roles.flatMap((row) => row.clearance.map((rule) => ({ role: row.role, ...rule })));
}

/**
 * The entities on whose records a role may see a level, resolved as the
 * masking interceptor resolves it. Another entity's fields also need an
 * ACTIVE transfer register entry; clearance alone does not share them.
 */
export function entitiesCleared(
  rules: readonly ClearanceRule[],
  role: Role,
  level: ClassificationLevel,
): EntityCode[] {
  return ENTITY_CODES.filter(
    (entity) =>
      classificationRank(resolveClearance(rules, role, entity)) >= classificationRank(level),
  );
}
