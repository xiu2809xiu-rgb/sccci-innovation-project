import { z } from 'zod';

import { aiProviderSchema } from '../ai/usage.js';
import { localeSchema } from '../auth/session.js';
import { userRefSchema } from '../auth/user-ref.js';
import { entityCodeSchema } from '../org/entities.js';
import { mappingSetSchema, mappingTargetSchema, transformSpecSchema } from './field-mapping.js';

export const MAPPING_PROPOSAL_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const;

export const mappingProposalStatusSchema = z.enum(MAPPING_PROPOSAL_STATUSES);

export type MappingProposalStatus = z.infer<typeof mappingProposalStatusSchema>;

/**
 * Data HuiTong must never store (CLAUDE.md data rules, ADR 0011). A column that
 * holds it is withheld from the model entirely and never mapped.
 */
export const PROHIBITED_KINDS = ['NATIONAL_ID', 'GENDER'] as const;

export const prohibitedKindSchema = z.enum(PROHIBITED_KINDS);

export type ProhibitedKind = z.infer<typeof prohibitedKindSchema>;

/**
 * Why a proposed column needs a closer look. PROHIBITED_FIELD marks data
 * HuiTong must never store, such as national ID numbers: it is never mapped.
 */
export const PROPOSAL_FLAGS = [
  'LOW_CONFIDENCE',
  'NO_MATCH',
  'PROHIBITED_FIELD',
  'REVIEW_TRANSFORM',
] as const;

export const proposalFlagSchema = z.enum(PROPOSAL_FLAGS);

export type ProposalFlag = z.infer<typeof proposalFlagSchema>;

/** Below this confidence a suggestion is flagged for review. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/** The AI's suggestion for one column of the sample file. */
export const proposalColumnSchema = z.object({
  sourceColumn: z.string().min(1).max(200),
  /** What the values look like (`E######`, `YYYY/MM/DD`), not the values. */
  sampleShape: z.string().max(200),
  target: mappingTargetSchema.nullable(),
  transform: transformSpecSchema.nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(600),
  flags: z.array(proposalFlagSchema),
  /** For a PROHIBITED_FIELD column, what it holds. Proposals made before gender was blocked lack it. */
  prohibitedKind: prohibitedKindSchema.optional(),
});

export type ProposalColumn = z.infer<typeof proposalColumnSchema>;

/**
 * A value the file implies but does not contain, proposed as a constant: the
 * legal entity a subsidiary's export belongs to, or the currency named in a
 * `Basic Salary (MYR)` header.
 */
export const proposalFixedValueSchema = z.object({
  target: mappingTargetSchema,
  value: z.string().min(1).max(100),
  rationale: z.string().max(600),
});

export type ProposalFixedValue = z.infer<typeof proposalFixedValueSchema>;

export const mappingProposalSchema = z.object({
  id: z.uuid(),
  sourceSystemName: z.string(),
  entityCode: entityCodeSchema.nullable(),
  connectorId: z.string().nullable(),
  fileName: z.string(),
  headers: z.array(z.string()),
  sampleRowCount: z.number().int().min(0),
  columns: z.array(proposalColumnSchema),
  fixedValues: z.array(proposalFixedValueSchema),
  status: mappingProposalStatusSchema,
  language: localeSchema,
  provider: aiProviderSchema.nullable(),
  model: z.string().nullable(),
  createdBy: userRefSchema,
  createdAt: z.iso.datetime(),
  reviewedBy: userRefSchema.nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewNote: z.string().nullable(),
  /** The mapping version an approval created. */
  mappingConfig: z
    .object({ id: z.uuid(), connectorId: z.string(), version: z.number().int().min(1) })
    .nullable(),
});

export type MappingProposal = z.infer<typeof mappingProposalSchema>;

/** The form fields sent with the sample file (multipart). */
export const createProposalFieldsSchema = z.object({
  sourceSystemName: z.string().trim().min(2).max(100),
  entityCode: entityCodeSchema.optional(),
  connectorId: z.string().trim().min(1).max(60).optional(),
  language: localeSchema.default('en'),
});

export type CreateProposalFields = z.infer<typeof createProposalFieldsSchema>;

/** HR's decision: the mapping as approved (edits included) and the connector it is for. */
export const approveProposalSchema = z.object({
  mappings: mappingSetSchema,
  note: z.string().trim().max(500).optional(),
  connector: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('existing'), connectorId: z.string().min(1).max(60) }),
    z.object({
      kind: z.literal('new'),
      name: z.string().trim().min(2).max(100),
      nameZh: z.string().trim().min(1).max(100),
      entityCode: entityCodeSchema,
    }),
  ]),
});

export type ApproveProposalRequest = z.infer<typeof approveProposalSchema>;

export const rejectProposalSchema = z.object({
  note: z.string().trim().min(3).max(500),
});

export type RejectProposalRequest = z.infer<typeof rejectProposalSchema>;

/** What a language model must return for a proposal; anything else is recorded as INVALID_OUTPUT. */
export const aiMappingOutputSchema = z.object({
  columns: z
    .array(
      z.object({
        sourceColumn: z.string().min(1).max(200),
        target: mappingTargetSchema.nullable(),
        transform: transformSpecSchema.nullable(),
        confidence: z.number().min(0).max(1),
        rationale: z.string().min(1).max(600),
        flags: z.array(proposalFlagSchema).default([]),
      }),
    )
    .max(100),
  fixedValues: z.array(proposalFixedValueSchema).max(10).default([]),
});

export type AiMappingOutput = z.infer<typeof aiMappingOutputSchema>;
