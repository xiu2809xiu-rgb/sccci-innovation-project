import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus';
import { Redis } from 'ioredis';

import { AppConfig } from '../../config/app-config.js';

/** Injection token for the shared Redis client. */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Readiness check: Redis answers PING. */
@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly indicators: HealthIndicatorService,
  ) {}

  async isHealthy(key = 'redis') {
    const session = this.indicators.check(key);
    try {
      // PING rejects when Redis is unreachable or errors.
      await this.redis.ping();
      return session.up();
    } catch {
      return session.down({ message: 'redis unreachable' });
    }
  }
}

/** Closes the shared client when the application shuts down. */
@Injectable()
class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

@Global()
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        new Redis(config.redis.url, { maxRetriesPerRequest: null }),
    },
    RedisHealthIndicator,
    RedisShutdown,
  ],
  exports: [REDIS_CLIENT, RedisHealthIndicator],
})
export class RedisModule {}
