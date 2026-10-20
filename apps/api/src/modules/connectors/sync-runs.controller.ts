import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';

import { UnauthenticatedError } from '../../common/errors/app-error.js';
import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { SyncService } from './sync/sync.service.js';

const params = z.object({ syncRunId: z.uuid() });

@ApiTags('connectors')
@Controller('sync-runs')
export class SyncRunsController {
  constructor(private readonly sync: SyncService) {}

  @Get(':syncRunId')
  @RequirePermissions(['employees:read'])
  @ApiOperation({
    summary: 'One sync run with its failures and, for a preview, what it would change (masked)',
  })
  async detail(
    @Param({ schema: params }) { syncRunId }: z.infer<typeof params>,
    @Req() req: Request,
  ) {
    if (!req.user) throw new UnauthenticatedError();
    return { data: await this.sync.detail(syncRunId, req.user) };
  }
}
