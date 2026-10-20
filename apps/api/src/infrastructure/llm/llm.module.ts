import { Global, Module } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';
import { AiUsageTracker } from './ai-usage.tracker.js';
import { LlmGateway } from './llm.gateway.js';
import { LLM_PROVIDER, type LlmProvider } from './llm.types.js';
import { BedrockLlmProvider } from './providers/bedrock-llm.provider.js';
import { MockLlmProvider } from './providers/mock-llm.provider.js';
import { OpenAiLlmProvider } from './providers/openai-llm.provider.js';

/** Picks the provider named by `LLM_PROVIDER`; the mock is the default and needs no key. */
function providerFor(config: AppConfig, mock: MockLlmProvider): LlmProvider {
  switch (config.llm.provider) {
    case 'bedrock':
      return BedrockLlmProvider.create(config.llm.bedrockRegion, config.llm.model);
    case 'openai':
      return new OpenAiLlmProvider(config.llm.model, config.llm.openAiApiKey ?? '');
    case 'mock':
      return mock;
  }
}

@Global()
@Module({
  providers: [
    MockLlmProvider,
    AiUsageTracker,
    { provide: LLM_PROVIDER, inject: [AppConfig, MockLlmProvider], useFactory: providerFor },
    LlmGateway,
  ],
  exports: [LlmGateway, AiUsageTracker, MockLlmProvider],
})
export class LlmModule {}
