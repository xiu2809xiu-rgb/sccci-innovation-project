import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';

/** Heap ceiling for the liveness probe; well above normal API usage. */
const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;

/**
 * Health endpoints for Docker, compose `depends_on` conditions and load balancers.
 * `/health/live` answers whether the process is alive; `/health` whether it can serve traffic.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([() => this.memory.checkHeap('heap', HEAP_LIMIT_BYTES)]);
  }

  @Get()
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.memory.checkHeap('heap', HEAP_LIMIT_BYTES)]);
  }
}
