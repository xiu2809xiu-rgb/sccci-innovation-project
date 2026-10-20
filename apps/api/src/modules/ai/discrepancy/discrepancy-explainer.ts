import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { AiProvider } from '@huitong/shared';

import { LlmGateway } from '../../../infrastructure/llm/llm.gateway.js';
import { MockLlmProvider } from '../../../infrastructure/llm/providers/mock-llm.provider.js';
import {
  buildDiscrepancyPrompt,
  DISCREPANCY_SYSTEM_PROMPT,
  readDiscrepancyPrompt,
  type DiscrepancyRequest,
} from './discrepancy.prompt.js';
import { mockExplainDiscrepancy } from './mock-discrepancy-explainer.js';

const MAX_TEXT = 1500;

/**
 * The AI discrepancy explainer: a plain-language account of why two systems
 * disagree, for HR to read before resolving a conflict. Advice only; it never
 * changes a record (ADR 0011).
 */
@Injectable()
export class DiscrepancyExplainer implements OnModuleInit {
  constructor(
    private readonly gateway: LlmGateway,
    private readonly mock: MockLlmProvider,
  ) {}

  onModuleInit(): void {
    this.mock.register('discrepancy-explainer', (request) => {
      const parsed = readDiscrepancyPrompt(request.prompt);
      return parsed ? mockExplainDiscrepancy(parsed) : 'No explanation is available.';
    });
  }

  async explain(
    request: DiscrepancyRequest,
    caller: { userId: string; requestId: string },
  ): Promise<{ text: string; provider: AiProvider; model: string }> {
    const result = await this.gateway.complete({
      feature: 'discrepancy-explainer',
      system: DISCREPANCY_SYSTEM_PROMPT,
      prompt: buildDiscrepancyPrompt(request),
      maxOutputTokens: 400,
      temperature: 0.2,
      userId: caller.userId,
      requestId: caller.requestId,
    });
    return {
      text: result.text.trim().slice(0, MAX_TEXT),
      provider: result.provider,
      model: result.model,
    };
  }
}
