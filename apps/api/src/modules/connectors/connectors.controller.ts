import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  paginationQuerySchema,
  startSyncSchema,
  type PaginationQuery,
  type StartSyncRequest,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { ValidationFailedError } from '../../common/errors/app-error.js';
import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { ConnectorsService } from './connectors.service.js';
import { SyncService } from './sync/sync.service.js';

const params = z.object({ connectorId: z.string().regex(/^[a-z0-9-]{2,60}$/) });
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,100}$/;

@ApiTags('connectors')
@Controller('connectors')
export class ConnectorsController {
  constructor(
    private readonly connectors: ConnectorsService,
    private readonly sync: SyncService,
  ) {}

  @Get()
  @RequirePermissions(['connectors:read'])
  @ApiOperation({
    summary: 'Every connected system with its status, last run and active mapping version',
  })
  async list() {
    return { data: await this.connectors.list() };
  }

  @Get(':connectorId')
  @RequirePermissions(['connectors:read'])
  @ApiOperation({
    summary: 'One connector: non-secret settings, credential reference and mapping versions',
  })
  async detail(@Param({ schema: params }) { connectorId }: z.infer<typeof params>) {
    return { data: await this.connectors.detail(connectorId) };
  }

  @Post(':connectorId/health-check')
  @HttpCode(200)
  @RequirePermissions(['connectors:read'])
  @ApiOperation({ summary: 'Check that the system responds' })
  async checkHealth(
    @Param({ schema: params }) { connectorId }: z.infer<typeof params>,
    @Req() req: Request,
  ) {
    return { data: await this.connectors.checkHealth(connectorId, requestMeta(req)) };
  }

  @Post(':connectorId/sync')
  @HttpCode(202)
  @RequirePermissions(['employees:sync'])
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Repeating a request with the same key returns the same run',
  })
  @ApiOperation({
    summary: 'Queue a sync: PREVIEW writes nothing; a manual APPLY must follow a recent preview',
  })
  async start(
    @Param({ schema: params }) { connectorId }: z.infer<typeof params>,
    @Body({ schema: startSyncSchema }) body: StartSyncRequest,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: Request,
  ) {
    if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new ValidationFailedError([
        { path: 'Idempotency-Key', message: '8 to 100 letters, digits, - or _' },
      ]);
    }
    const { run } = await this.sync.start(
      connectorId,
      { mode: body.mode, trigger: 'MANUAL', idempotencyKey, previewRunId: body.previewRunId },
      requestMeta(req),
    );
    return { data: run };
  }

  @Get(':connectorId/sync-runs')
  @RequirePermissions(['connectors:read'])
  @ApiOperation({ summary: "A connector's sync runs, newest first" })
  async runs(
    @Param({ schema: params }) { connectorId }: z.infer<typeof params>,
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ) {
    const { items, total } = await this.sync.listForConnector(
      connectorId,
      query.page,
      query.pageSize,
    );
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }
}
