import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfig } from '../../config/app-config.js';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * The single Prisma client (Prisma 7 with the node-postgres driver adapter).
 * Only repositories inject it; services and controllers never call Prisma directly.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: AppConfig) {
    // node-postgres has no connection timeout by default; fail fast instead of hanging.
    super({
      adapter: new PrismaPg({
        connectionString: config.database.url,
        connectionTimeoutMillis: 5000,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
