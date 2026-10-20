import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AppConfig } from '../../../config/app-config.js';
import { SyncRunsRepository } from './sync-runs.repository.js';
import { SyncService } from './sync.service.js';

/** The HR systems a fresh demo stack loads, in order: Singapore first, so its owned fields win from the start. */
const BOOTSTRAP_CONNECTORS = ['sg-hr', 'cn-hq'] as const;

/**
 * With `BOOTSTRAP_SYNC=true`, a fresh stack (no sync ever requested) loads
 * the employee master from both HR systems on start, so the demo opens with
 * data, provenance and the expected conflicts. Off by default and in tests.
 */
@Injectable()
export class BootstrapSyncService implements OnApplicationBootstrap {
  constructor(
    private readonly config: AppConfig,
    private readonly runs: SyncRunsRepository,
    private readonly sync: SyncService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BootstrapSyncService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.bootstrapSync || (await this.runs.anyRun())) return;
    for (const connectorId of BOOTSTRAP_CONNECTORS) {
      try {
        await this.sync.start(
          connectorId,
          { mode: 'APPLY', trigger: 'BOOTSTRAP', idempotencyKey: 'bootstrap' },
          { actor: null, ip: null, userAgent: null, traceId: `bootstrap-${connectorId}` },
        );
        this.logger.info({ connectorId }, 'bootstrap sync queued');
      } catch (error) {
        this.logger.warn({ err: error, connectorId }, 'bootstrap sync not started');
      }
    }
  }
}
