import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { paginationQuerySchema, type PaginationQuery } from '@huitong/shared';

import { RequirePermissions } from '../../common/decorators/route-metadata.js';
import { UsersRepository } from './users.repository.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get()
  @RequirePermissions(['users:manage'])
  @ApiOperation({ summary: 'List user accounts (administrators)' })
  async list(@Query({ schema: paginationQuerySchema }) query: PaginationQuery) {
    const { items, total } = await this.users.list(query.page, query.pageSize);
    return { data: items, meta: { page: query.page, pageSize: query.pageSize, total } };
  }
}
