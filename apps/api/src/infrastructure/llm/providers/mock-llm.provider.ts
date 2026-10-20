import { Injectable } from '@nestjs/common';
import type { AiFeature } from '@huitong/shared';

import type { LlmCompletion, LlmProvider, LlmRequest } from '../llm.types.js';
import { estimateTokens } from '../token-estimate.js';

/** Deterministic stand-in for a model's answer, registered per feature. */
export type MockResponder = (request: LlmRequest) => string;

export const MOCK_MODEL = 'huitong-mock-1';

/**
 * The default provider: deterministic, offline and free. Each AI feature
 * registers a responder that produces the answer a model would give, so demos
 * and tests behave the same every time without an API key.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  readonly name = 'MOCK' as const;
  readonly model = MOCK_MODEL;
  private readonly responders = new Map<AiFeature, MockResponder>();

  register(feature: AiFeature, responder: MockResponder): void {
    this.responders.set(feature, responder);
  }

  complete(request: LlmRequest): Promise<LlmCompletion> {
    const responder = this.responders.get(request.feature);
    const text = responder
      ? responder(request)
      : JSON.stringify({ feature: request.feature, note: 'No mock responder registered' });
    return Promise.resolve({
      text,
      inputTokens: estimateTokens(request.system) + estimateTokens(request.prompt),
      outputTokens: estimateTokens(text),
      model: this.model,
    });
  }
}
