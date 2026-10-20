import type { AiFeature, AiProvider } from '@huitong/shared';

/** One request to a language model. */
export interface LlmRequest {
  feature: AiFeature;
  system: string;
  prompt: string;
  maxOutputTokens: number;
  temperature?: number;
  /** The signed-in user the call is made for (recorded with the usage). */
  userId?: string | null;
  /** Correlation id of the HTTP request that caused the call. */
  requestId?: string | null;
}

/** What a provider returns: the text and the token counts it reports. */
export interface LlmCompletion {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/** What the gateway returns: the completion plus its usage record. */
export interface LlmResult extends LlmCompletion {
  provider: AiProvider;
  latencyMs: number;
  usageRecordId: string;
}

/** A language-model backend (Strategy). */
export interface LlmProvider {
  readonly name: AiProvider;
  readonly model: string;
  complete(request: LlmRequest): Promise<LlmCompletion>;
}

/** Injection token for the configured provider. */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
