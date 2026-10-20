import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { clickstreamBatchSchema, type ClickstreamBatch, type DataEnvelope } from '@huitong/shared';
import type { Request } from 'express';

import { Public, SkipCsrf } from '../../common/decorators/route-metadata.js';
import { ClickstreamRepository } from './clickstream.repository.js';

/**
 * Minimal first-party clickstream ingestion (written by area 1; area 4 owns the
 * analytics built on it). Public, because sign-in pages are measured too, and
 * CSRF-exempt, because `navigator.sendBeacon` cannot set headers. Only the
 * caller's role is kept, never their identity.
 */
@ApiTags('analytics')
@Controller('analytics')
export class ClickstreamIngestController {
  constructor(private readonly events: ClickstreamRepository) {}

  @Post('events')
  @Public()
  @SkipCsrf()
  @HttpCode(202)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Store a batch of anonymous clickstream events' })
  async ingest(
    @Body({ schema: clickstreamBatchSchema }) batch: ClickstreamBatch,
    @Req() req: Request,
  ): Promise<DataEnvelope<{ accepted: number }>> {
    // Global Privacy Control: the browser asked not to be tracked, so nothing is stored.
    if (req.header('sec-gpc') === '1') {
      return { data: { accepted: 0 } };
    }
    await this.events.saveBatch(batch.events, req.user?.role ?? null);
    return { data: { accepted: batch.events.length } };
  }
}
