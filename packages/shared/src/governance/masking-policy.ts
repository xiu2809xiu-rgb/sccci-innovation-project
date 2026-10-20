import { z } from 'zod';

import type { Role } from '../auth/roles.js';
import { roleSchema } from '../auth/roles.js';
import type { EntityCode } from '../org/entities.js';
import { entityCodeSchema } from '../org/entities.js';
import type { ClassificationLevel } from './classification.js';
import {
  classificationLevelSchema,
  classificationRank,
  isWithinClearance,
} from './classification.js';
import type { MaskedValue, MaskReason } from './masked-value.js';
import { maskReasonSchema } from './masked-value.js';

/**
 * Highest classification a role may see for records of an entity. A rule with
 * `entityCode: null` applies to every entity without a more specific rule.
 * `deniedReason` overrides the reason reported when this rule hides a value.
 */
export const clearanceRuleSchema = z.object({
  role: roleSchema,
  entityCode: entityCodeSchema.nullable(),
  maxLevel: classificationLevelSchema,
  deniedReason: maskReasonSchema.optional(),
});

export type ClearanceRule = z.infer<typeof clearanceRuleSchema>;

/**
 * Baseline clearance (facts sheet section 6): HR sees restricted data only for
 * its own entity. HQ HR is capped at CONFIDENTIAL for Singapore records until a
 * cross-border transfer entry covers them.
 */
export const DEFAULT_CLEARANCE_RULES: readonly ClearanceRule[] = [
  { role: 'SYSTEM_ADMIN', entityCode: null, maxLevel: 'CONFIDENTIAL' },
  { role: 'HR_SG', entityCode: 'SG01', maxLevel: 'RESTRICTED' },
  { role: 'HR_SG', entityCode: null, maxLevel: 'CONFIDENTIAL' },
  { role: 'HR_HQ', entityCode: 'CN01', maxLevel: 'RESTRICTED' },
  {
    role: 'HR_HQ',
    entityCode: null,
    maxLevel: 'CONFIDENTIAL',
    deniedReason: 'CROSS_BORDER_NOT_APPROVED',
  },
  { role: 'HIRING_MANAGER', entityCode: null, maxLevel: 'INTERNAL' },
  { role: 'ADMIN_OPS', entityCode: null, maxLevel: 'INTERNAL' },
  { role: 'MANAGEMENT', entityCode: null, maxLevel: 'INTERNAL' },
  { role: 'AUDITOR', entityCode: null, maxLevel: 'INTERNAL' },
];

export type MaskDecision = { visible: true } | { visible: false; reason: MaskReason };

/** Finds the rule that applies: an entity-specific rule beats the role's catch-all. */
function applicableRule(
  rules: readonly ClearanceRule[],
  role: Role,
  entityCode: EntityCode,
): ClearanceRule | undefined {
  const forRole = rules.filter((rule) => rule.role === role);
  return (
    forRole.find((rule) => rule.entityCode === entityCode) ??
    forRole.find((rule) => rule.entityCode === null)
  );
}

/** Highest level the role may see for records of `entityCode`; PUBLIC when no rule matches. */
export function resolveClearance(
  rules: readonly ClearanceRule[],
  role: Role,
  entityCode: EntityCode,
): ClassificationLevel {
  return applicableRule(rules, role, entityCode)?.maxLevel ?? 'PUBLIC';
}

/**
 * Decides whether a field at `level` on a record of `entityCode` is visible to
 * `role`, and if not, why. The reason is ENTITY_SCOPE when the role could see
 * the field for another entity, otherwise ROLE_CLEARANCE, unless the rule
 * names its own reason.
 */
export function decideMasking(
  rules: readonly ClearanceRule[],
  role: Role,
  entityCode: EntityCode,
  level: ClassificationLevel,
): MaskDecision {
  const rule = applicableRule(rules, role, entityCode);
  const clearance = rule?.maxLevel ?? 'PUBLIC';
  if (isWithinClearance(level, clearance)) {
    return { visible: true };
  }
  if (rule?.deniedReason) {
    return { visible: false, reason: rule.deniedReason };
  }
  const clearedElsewhere = rules.some(
    (other) =>
      other.role === role &&
      other.entityCode !== null &&
      other.entityCode !== entityCode &&
      classificationRank(other.maxLevel) >= classificationRank(level),
  );
  return { visible: false, reason: clearedElsewhere ? 'ENTITY_SCOPE' : 'ROLE_CLEARANCE' };
}

/**
 * Returns a copy of `record` with every classified field the role may not see
 * replaced by a {@link MaskedValue}. Null and undefined values stay as they
 * are: there is nothing to hide, and showing "empty" is not a disclosure.
 */
export function maskRecord<T extends Record<string, unknown>>(
  record: T,
  classifications: Readonly<Partial<Record<keyof T, ClassificationLevel>>>,
  context: { rules: readonly ClearanceRule[]; role: Role; entityCode: EntityCode },
): { [K in keyof T]: T[K] | MaskedValue } {
  const result: Record<string, unknown> = { ...record };
  for (const [field, level] of Object.entries(classifications) as [string, ClassificationLevel][]) {
    const value = result[field];
    if (value === null || value === undefined) {
      continue;
    }
    const decision = decideMasking(context.rules, context.role, context.entityCode, level);
    if (!decision.visible) {
      const masked: MaskedValue = { masked: true, classification: level, reason: decision.reason };
      result[field] = masked;
    }
  }
  return result as { [K in keyof T]: T[K] | MaskedValue };
}
