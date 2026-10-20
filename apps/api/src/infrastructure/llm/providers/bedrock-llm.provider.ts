import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

import type { LlmCompletion, LlmProvider, LlmRequest } from '../llm.types.js';

/**
 * AWS Bedrock through the Converse API. Credentials come from the standard AWS
 * chain (environment, profile or task role); the region keeps Singapore data
 * in ap-southeast-1 by default.
 */
export class BedrockLlmProvider implements LlmProvider {
  readonly name = 'BEDROCK' as const;

  constructor(
    readonly model: string,
    private readonly client: Pick<BedrockRuntimeClient, 'send'>,
  ) {}

  static create(region: string, model: string): BedrockLlmProvider {
    return new BedrockLlmProvider(model, new BedrockRuntimeClient({ region }));
  }

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.model,
        system: [{ text: request.system }],
        messages: [{ role: 'user', content: [{ text: request.prompt }] }],
        inferenceConfig: {
          maxTokens: request.maxOutputTokens,
          temperature: request.temperature ?? 0,
        },
      }),
    );
    const text = (response.output?.message?.content ?? [])
      .map((block) => block.text ?? '')
      .join('');
    return {
      text,
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      model: this.model,
    };
  }
}
