import { z } from 'zod';

import type { LlmCompletion, LlmProvider, LlmRequest } from '../llm.types.js';

/** The parts of the Chat Completions response the provider uses (validated, not trusted). */
const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }),
});

/** Optional OpenAI provider over the Chat Completions REST API (no SDK dependency). */
export class OpenAiLlmProvider implements LlmProvider {
  readonly name = 'OPENAI' as const;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    const response = await this.fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature ?? 0,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`OpenAI responded ${String(response.status)}`);
    }
    const body = completionSchema.parse(await response.json());
    return {
      text: body.choices[0]?.message.content ?? '',
      inputTokens: body.usage.prompt_tokens,
      outputTokens: body.usage.completion_tokens,
      model: this.model,
    };
  }
}
