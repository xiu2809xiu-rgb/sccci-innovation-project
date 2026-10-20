import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dataEnvelopeSchema,
  overviewSchema,
  type DataEnvelope,
  type Overview,
} from '@huitong/shared';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import { OverviewService } from './overview.service.js';

@ApiTags('overview')
@Controller('overview')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  @ApiOperation({
    summary: 'KPIs, sync health, pending approvals, open conflicts and recent activity',
  })
  @ApiOkResponse({ standardSchema: dataEnvelopeSchema(overviewSchema) })
  async get(@CurrentUser() user: AuthenticatedUser): Promise<DataEnvelope<Overview>> {
    return { data: await this.overview.overview(user) };
  }
}
