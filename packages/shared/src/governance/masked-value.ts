import { z } from 'zod';

import { classificationLevelSchema } from './classification.js';

/**
 * Why a value was withheld. The web app shows `masking.reason.<REASON>` in the
 * "why is this hidden" tooltip.
 */
export const MASK_REASONS = [
  'ROLE_CLEARANCE',
  'ENTITY_SCOPE',
  'CROSS_BORDER_NOT_APPROVED',
] as const;

export const maskReasonSchema = z.enum(MASK_REASONS);

export type MaskReason = z.infer<typeof maskReasonSchema>;

/** Stands in for a value the caller is not cleared to see. */
export const maskedValueSchema = z.object({
  masked: z.literal(true),
  classification: classificationLevelSchema,
  reason: maskReasonSchema,
});

export type MaskedValue = z.infer<typeof maskedValueSchema>;

/** A field that is either its real value or a {@link MaskedValue}. */
export function maskable<T extends z.ZodType>(schema: T) {
  return z.union([schema, maskedValueSchema]);
}

export type Maskable<T> = T | MaskedValue;

/** Type guard for masked values (works on untrusted JSON). */
export function isMasked(value: unknown): value is MaskedValue {
  return maskedValueSchema.safeParse(value).success;
}
