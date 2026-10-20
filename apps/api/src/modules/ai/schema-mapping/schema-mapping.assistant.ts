import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  aiMappingOutputSchema,
  LOW_CONFIDENCE_THRESHOLD,
  type AiMappingOutput,
  type AiProvider,
  type MappingTarget,
  type ProposalColumn,
  type ProposalFixedValue,
  type ProposalFlag,
} from '@huitong/shared';

import { AiOutputInvalidError } from '../../../common/errors/app-error.js';
import { AiUsageTracker } from '../../../infrastructure/llm/ai-usage.tracker.js';
import { LlmGateway } from '../../../infrastructure/llm/llm.gateway.js';
import { MockLlmProvider } from '../../../infrastructure/llm/providers/mock-llm.provider.js';
import { mockSchemaMapping } from './mock-schema-mapper.js';
import {
  buildSchemaMappingPrompt,
  readSchemaMappingPrompt,
  SCHEMA_MAPPING_SYSTEM_PROMPT,
  type MappingRequest,
} from './schema-mapping.prompt.js';

export interface MappingSuggestion {
  columns: ProposalColumn[];
  fixedValues: ProposalFixedValue[];
  usageRecordId: string;
  provider: AiProvider;
  model: string;
}

const unique = (flags: readonly ProposalFlag[]) => [...new Set(flags)];

/**
 * The AI schema-mapping assistant: asks the configured model (the mock by
 * default) for a mapping, then re-checks the answer on the server. It only
 * proposes; nothing is used until HR approves (ADR 0011), and the gateway
 * records every call through AiUsageTracker.
 */
@Injectable()
export class SchemaMappingAssistant implements OnModuleInit {
  constructor(
    private readonly gateway: LlmGateway,
    private readonly tracker: AiUsageTracker,
    private readonly mock: MockLlmProvider,
  ) {}

  onModuleInit(): void {
    this.mock.register('schema-mapping', (request) => {
      const parsed = readSchemaMappingPrompt(request.prompt);
      return JSON.stringify(parsed ? mockSchemaMapping(parsed) : { columns: [], fixedValues: [] });
    });
  }

  async propose(
    request: MappingRequest,
    caller: { userId: string; requestId: string },
  ): Promise<MappingSuggestion> {
    const result = await this.gateway.complete({
      feature: 'schema-mapping',
      system: SCHEMA_MAPPING_SYSTEM_PROMPT,
      prompt: buildSchemaMappingPrompt(request),
      maxOutputTokens: 4000,
      temperature: 0,
      userId: caller.userId,
      requestId: caller.requestId,
    });
    const output = SchemaMappingAssistant.parse(result.text);
    if (!output) {
      await this.tracker.markOutcome(result.usageRecordId, 'INVALID_OUTPUT');
      throw new AiOutputInvalidError();
    }
    return {
      ...SchemaMappingAssistant.reconcile(output, request),
      usageRecordId: result.usageRecordId,
      provider: result.provider,
      model: result.model,
    };
  }

  private static parse(text: string): AiMappingOutput | null {
    const json = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      const parsed = aiMappingOutputSchema.safeParse(JSON.parse(json));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Server-side rules on whatever the model said: one row per uploaded column
   * (invented columns are dropped), national ID columns never mapped, each
   * target at most once, and low confidence always flagged.
   */
  private static reconcile(
    output: AiMappingOutput,
    request: MappingRequest,
  ): Pick<MappingSuggestion, 'columns' | 'fixedValues'> {
    const suggestions = new Map(output.columns.map((column) => [column.sourceColumn, column]));
    const used = new Set<MappingTarget>();
    const columns = request.columns.map((column): ProposalColumn => {
      const suggestion = suggestions.get(column.header);
      const base = { sourceColumn: column.header, sampleShape: column.shape };
      if (column.prohibited) {
        return {
          ...base,
          target: null,
          transform: null,
          confidence: 1,
          rationale: suggestion?.rationale ?? 'National ID numbers are never stored.',
          flags: ['PROHIBITED_FIELD'],
        };
      }
      const target = suggestion?.target ?? null;
      if (!suggestion || target === null || used.has(target)) {
        return {
          ...base,
          target: null,
          transform: null,
          confidence: suggestion && target === null ? suggestion.confidence : 0,
          rationale: suggestion?.rationale ?? 'The model made no suggestion for this column.',
          flags: unique([
            ...(suggestion?.flags ?? []).filter((flag) => flag !== 'PROHIBITED_FIELD'),
            'NO_MATCH',
          ]),
        };
      }
      used.add(target);
      const flags = suggestion.flags.filter(
        (flag) => flag !== 'PROHIBITED_FIELD' && flag !== 'NO_MATCH',
      );
      if (suggestion.confidence < LOW_CONFIDENCE_THRESHOLD) flags.push('LOW_CONFIDENCE');
      return {
        ...base,
        target,
        transform: suggestion.transform,
        confidence: suggestion.confidence,
        rationale: suggestion.rationale,
        flags: unique(flags),
      };
    });
    const fixedValues = output.fixedValues.filter((fixed) => {
      if (used.has(fixed.target)) return false;
      used.add(fixed.target);
      return true;
    });
    return { columns, fixedValues };
  }
}
