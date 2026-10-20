import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from './prisma.service.js';

/** Readiness check: the database answers a trivial query. */
@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: HealthIndicatorService,
  ) {}

  async isHealthy(key = 'database') {
    const session = this.indicators.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return session.up();
    } catch {
      return session.down({ message: 'database unreachable' });
    }
  }
}
