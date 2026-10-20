import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.js';
import { QUEUES } from './queue-names.js';

/**
 * BullMQ infrastructure: one Redis connection configuration and the shared
 * queues. Defaults give every job three attempts with exponential backoff and
 * keep finished jobs long enough to inspect them.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        // Workers must wait for Redis rather than fail, hence no per-request retry limit.
        connection: { url: config.redis.url, maxRetriesPerRequest: null },
        prefix: 'huitong',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 24 * 3600, count: 1000 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      }),
    }),
    BullModule.registerQueue(...Object.values(QUEUES).map((name) => ({ name }))),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
