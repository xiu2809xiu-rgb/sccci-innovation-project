import { z } from 'zod';

import { entityCodeSchema } from '../org/entities.js';
import { employeeNoSchema } from './canonical-employee.js';

/**
 * Why a new record might be the same person as an existing employee. Each is
 * a hint for HR, never a match: names, romanisations and look-alike spellings
 * never make two records one person (story B-5). Only the same group employee
 * number does.
 */
export const POSSIBLE_MATCH_REASONS = [
  'SAME_LOCAL_NAME',
  'SAME_LATIN_NAME',
  'SAME_NAME_PARTS',
  'SAME_WORK_EMAIL',
] as const;

export const possibleMatchReasonSchema = z.enum(POSSIBLE_MATCH_REASONS);

export type PossibleMatchReason = z.infer<typeof possibleMatchReasonSchema>;

/**
 * An existing employee who may be the same person as a record a sync would
 * create. Only the number is kept, so no one else's name is copied into the
 * stored preview; HR opens the record to compare.
 */
export const possibleMatchSchema = z.object({
  employeeNo: employeeNoSchema,
  entityCode: entityCodeSchema,
  reasons: z.array(possibleMatchReasonSchema).min(1),
});

export type PossibleMatch = z.infer<typeof possibleMatchSchema>;
