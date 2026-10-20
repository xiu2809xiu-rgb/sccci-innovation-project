import { Module } from '@nestjs/common';

import { ClickstreamIngestController } from './clickstream-ingest.controller.js';
import { ClickstreamRepository } from './clickstream.repository.js';

@Module({
  controllers: [ClickstreamIngestController],
  providers: [ClickstreamRepository],
})
export class AnalyticsModule {}
