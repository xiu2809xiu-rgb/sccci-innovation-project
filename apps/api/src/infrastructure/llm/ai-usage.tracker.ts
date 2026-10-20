import { Injectable } from '@nestjs/common';
import type { AiFeature, AiOutcome, AiProvider } from '@huitong/shared';

import { AppConfig } from '../../config/app-config.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface UsageEntry {
  feature: AiFeature;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  outcome: AiOutcome;
  userId?: string | null | undefined;
  requestId?: string | null | undefined;
  errorCode?: string | null | undefined;
}

/**
 * Records every LLM call: tokens in and out, model, latency, estimated cost,
 * feature, user and outcome. Cost is tokens times the configured reference
 * prices (A-52), not an invoice.
 */
@Injectable()
export class AiUsageTracker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /** Estimated USD cost for a call. */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const { priceInputPer1kUsd, priceOutputPer1kUsd } = this.config.llm;
    return (inputTokens / 1000) * priceInputPer1kUsd + (outputTokens / 1000) * priceOutputPer1kUsd;
  }

  /** Stores one usage record and returns its id. */
  async record(entry: UsageEntry): Promise<string> {
    const created = await this.prisma.aiUsageRecord.create({
      data: {
        feature: entry.feature,
        provider: entry.provider,
        model: entry.model,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        latencyMs: entry.latencyMs,
        costEstimateUsd: this.estimateCost(entry.inputTokens, entry.outputTokens),
        outcome: entry.outcome,
        userId: entry.userId ?? null,
        requestId: entry.requestId ?? null,
        errorCode: entry.errorCode ?? null,
      },
      select: { id: true },
    });
    return created.id;
  }

  /** Updates a call's outcome after the fact, e.g. INVALID_OUTPUT or REJECTED by a reviewer. */
  async markOutcome(usageRecordId: string, outcome: AiOutcome): Promise<void> {
    await this.prisma.aiUsageRecord.update({ where: { id: usageRecordId }, data: { outcome } });
  }
}
