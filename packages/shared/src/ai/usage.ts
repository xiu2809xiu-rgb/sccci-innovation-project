import { z } from 'zod';

/** Product features that call an LLM; every call is recorded against one of them. */
export const AI_FEATURES = ['schema-mapping', 'discrepancy-explainer'] as const;

export const aiFeatureSchema = z.enum(AI_FEATURES);

export type AiFeature = z.infer<typeof aiFeatureSchema>;

export const AI_PROVIDERS = ['MOCK', 'BEDROCK', 'OPENAI'] as const;

export const aiProviderSchema = z.enum(AI_PROVIDERS);

export type AiProvider = z.infer<typeof aiProviderSchema>;

/**
 * INVALID_OUTPUT: the model answered but its output failed schema validation.
 * REJECTED: a human reviewer rejected the AI proposal.
 */
export const AI_OUTCOMES = ['SUCCESS', 'ERROR', 'INVALID_OUTPUT', 'REJECTED'] as const;

export const aiOutcomeSchema = z.enum(AI_OUTCOMES);

export type AiOutcome = z.infer<typeof aiOutcomeSchema>;

/** One recorded LLM call, as stored by `AiUsageTracker` and read by the area 4 dashboards. */
export const aiUsageRecordSchema = z.object({
  id: z.uuid(),
  feature: aiFeatureSchema,
  provider: aiProviderSchema,
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  latencyMs: z.number().int().min(0),
  costEstimateUsd: z.number().min(0),
  outcome: aiOutcomeSchema,
  userId: z.uuid().nullable(),
  requestId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type AiUsageRecord = z.infer<typeof aiUsageRecordSchema>;
