import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { employeeListQuerySchema, employeeNoSchema, type EmployeeListQuery } from '@huitong/shared';
import type { Request } from 'express';
import { z } from 'zod';

import { UnauthenticatedError } from '../../common/errors/app-error.js';
import { requestMeta } from '../../common/http/request-meta.js';
import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { EmployeesService } from './employees.service.js';

const params = z.object({ employeeNo: employeeNoSchema });

function signedIn(req: Request) {
  const meta = requestMeta(req);
  if (!meta.actor) throw new UnauthenticatedError();
  return { ...meta, actor: meta.actor };
}

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions(['employees:read'])
  @ApiOperation({
    summary:
      "Search the employee master (INTERNAL fields only), across the entities the caller's entity may receive",
  })
  async list(
    @Query({ schema: employeeListQuerySchema }) query: EmployeeListQuery,
    @Req() req: Request,
  ) {
    const { items, total } = await this.employees.list(query, signedIn(req).actor);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  @Get(':employeeNo')
  @RequirePermissions(['employees:read'])
  @ApiOperation({
    summary:
      "One record with every source side by side, its conflicts and history, masked for the caller's role",
  })
  async detail(
    @Param({ schema: params }) { employeeNo }: z.infer<typeof params>,
    @Req() req: Request,
  ) {
    return { data: await this.employees.detail(employeeNo, signedIn(req)) };
  }
}
