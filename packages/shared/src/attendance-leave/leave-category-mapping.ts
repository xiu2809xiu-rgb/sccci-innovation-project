import { z } from 'zod';

import { paginationQuerySchema } from '../api/envelope.js';
import { leaveCategorySchema } from './leave-category.js';

/** Mirrors the Prisma enum `MappingRuleStatus`: a DRAFT rule waits for approval. */
export const MAPPING_RULE_STATUSES = ['DRAFT', 'ACTIVE'] as const;

export const mappingRuleStatusSchema = z.enum(MAPPING_RULE_STATUSES);

export type MappingRuleStatus = z.infer<typeof mappingRuleStatusSchema>;

/** One rule: a source system's leave code and the canonical category it counts as. */
export const leaveCategoryMappingSchema = z.object({
  id: z.uuid(),
  connectorId: z.string(),
  /** The source system's code, e.g. `NJ` or `AL`. */
  sourceCategory: z.string(),
  /** The source system's own label, e.g. 年假 or Annual Leave. */
  sourceLabel: z.string(),
  canonicalCategory: leaveCategorySchema,
  /** The company template's column, or null when it has none (reported as an exception). */
  templateColumn: z.string().nullable(),
  status: mappingRuleStatusSchema,
  version: z.number().int().min(1),
  updatedAt: z.iso.datetime(),
});

export type LeaveCategoryMapping = z.infer<typeof leaveCategoryMappingSchema>;

export const leaveCategoryMappingListQuerySchema = paginationQuerySchema.extend({
  connectorId: z.string().trim().max(64).optional(),
});

export type LeaveCategoryMappingListQuery = z.infer<typeof leaveCategoryMappingListQuerySchema>;

/** Body of `PUT /attendance-leave/category-mappings/:mappingId`: a proposed change, approved before use. */
export const changeLeaveCategoryMappingSchema = z.object({
  canonicalCategory: leaveCategorySchema,
  templateColumn: z.string().trim().max(120).nullable(),
  /** Why the rule changes, kept with the audit event. */
  reason: z.string().trim().min(1).max(500),
});

export type ChangeLeaveCategoryMapping = z.infer<typeof changeLeaveCategoryMappingSchema>;
