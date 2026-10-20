import { Module } from '@nestjs/common';

import { OverviewController } from './overview.controller.js';
import { OverviewRepository } from './overview.repository.js';
import { OverviewService } from './overview.service.js';

/** The overview page's read model (area 1). */
@Module({
  controllers: [OverviewController],
  providers: [OverviewRepository, OverviewService],
})
export class OverviewModule {}
