import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  conflictListQuerySchema,
  explainConflictSchema,
  resolveConflictSchema,
  type ConflictListQuery,
  type ExplainConflictRequest,
  type ResolveConflictRequest,
} from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { UnauthenticatedError } from '../../common/errors/app-error.js';
import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { ConflictsService } from './conflicts.service.js';

const params = z.object({ conflictId: z.uuid() });

function signedIn(req: Request) {
  const meta = requestMeta(req);
  if (!meta.actor) throw new UnauthenticatedError();
  return { ...meta, actor: meta.actor };
}

@ApiTags('employees')
@Controller('conflicts')
export class ConflictsController {
  constructor(private readonly conflicts: ConflictsService) {}

  @Get()
  @RequirePermissions(['employees:read'])
  @ApiOperation({
    summary: 'Conflicts between sources (open by default), values masked for the caller',
  })
  async list(
    @Query({ schema: conflictListQuerySchema }) query: ConflictListQuery,
    @Req() req: Request,
  ) {
    const { items, total } = await this.conflicts.list(query, signedIn(req).actor);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Post(':conflictId/resolve')
  @HttpCode(200)
  @RequirePermissions(['conflicts:resolve'])
  @ApiOperation({
    summary: 'Choose the source of truth, or enter the right value; the decision is audited',
  })
  async resolve(
    @Param({ schema: params }) { conflictId }: z.infer<typeof params>,
    @Body({ schema: resolveConflictSchema }) body: ResolveConflictRequest,
    @Req() req: Request,
  ) {
    return { data: await this.conflicts.resolve(conflictId, body, signedIn(req)) };
  }

  @Post(':conflictId/explain')
  @HttpCode(200)
  @RequirePermissions(['conflicts:resolve'])
  @ApiOperation({
    summary: 'Ask the AI discrepancy explainer about a conflict (advice only, never applied)',
  })
  async explain(
    @Param({ schema: params }) { conflictId }: z.infer<typeof params>,
    @Body({ schema: explainConflictSchema }) body: ExplainConflictRequest,
    @Req() req: Request,
  ) {
    return { data: await this.conflicts.explain(conflictId, body.language, signedIn(req)) };
  }
}
