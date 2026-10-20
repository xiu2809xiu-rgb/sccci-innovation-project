import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';

import { Public } from '../../common/decorators/route-metadata.js';
import { PrismaHealthIndicator } from '../../infrastructure/prisma/prisma.health.js';
import { RedisHealthIndicator } from '../../infrastructure/redis/redis.module.js';

/** Heap ceiling for the liveness probe; well above normal API usage. */
const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;

/**
 * Health endpoints for Docker, compose `depends_on` conditions and load
 * balancers. `/health/live` answers whether the process is alive; `/health`
 * whether it can serve traffic (database and Redis reachable).
 */
@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly database: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness: the process is running' })
  live(): Promise<HealthCheckResult> {
    return this.health.check([() => this.memory.checkHeap('heap', HEAP_LIMIT_BYTES)]);
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: the database and Redis are reachable' })
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy(), () => this.redis.isHealthy()]);
  }
}
