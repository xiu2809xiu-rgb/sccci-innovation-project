import { Inject, Injectable } from '@nestjs/common';

import { UpstreamUnavailableError } from '../../common/errors/app-error.js';
import { AiUsageTracker } from './ai-usage.tracker.js';
import { LLM_PROVIDER, type LlmProvider, type LlmRequest, type LlmResult } from './llm.types.js';

/**
 * The only way the application talks to a language model. It calls the
 * configured provider and records every call, including failed ones, through
 * {@link AiUsageTracker}. It never writes to systems of record: callers must
 * put AI output in front of a human for approval.
 */
@Injectable()
export class LlmGateway {
  constructor(
    @Inject(LLM_PROVIDER) private readonly provider: LlmProvider,
    private readonly tracker: AiUsageTracker,
  ) {}

  async complete(request: LlmRequest): Promise<LlmResult> {
    const started = performance.now();
    try {
      const completion = await this.provider.complete(request);
      const latencyMs = Math.max(0, Math.round(performance.now() - started));
      const usageRecordId = await this.tracker.record({
        feature: request.feature,
        provider: this.provider.name,
        model: completion.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        latencyMs,
        outcome: 'SUCCESS',
        userId: request.userId,
        requestId: request.requestId,
      });
      return { ...completion, provider: this.provider.name, latencyMs, usageRecordId };
    } catch (error) {
      await this.tracker.record({
        feature: request.feature,
        provider: this.provider.name,
        model: this.provider.model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
        outcome: 'ERROR',
        userId: request.userId,
        requestId: request.requestId,
        errorCode: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new UpstreamUnavailableError(`The ${this.provider.name.toLowerCase()} language model`);
    }
  }
}
