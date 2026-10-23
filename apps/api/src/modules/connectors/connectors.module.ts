import { Module } from '@nestjs/common';

import { EmployeesModule } from '../employees/employees.module.js';
import { MappingModule } from '../mapping/mapping.module.js';
import { ConnectorFactory } from './connector-factory.js';
import { ConnectorsController } from './connectors.controller.js';
import { ConnectorsRepository } from './connectors.repository.js';
import { ConnectorsService } from './connectors.service.js';
import { FileImportController } from './imports/file-import.controller.js';
import { FileImportService } from './imports/file-import.service.js';
import { StagedImportStore } from './imports/staged-import.store.js';
import { SyncRunsController } from './sync-runs.controller.js';
import { BootstrapSyncService } from './sync/bootstrap-sync.service.js';
import { EmployeeSyncPipeline } from './sync/employee-sync.pipeline.js';
import { SyncProgressReporter } from './sync/sync-progress.reporter.js';
import { SyncRunsRepository } from './sync/sync-runs.repository.js';
import { SyncProcessor } from './sync/sync.processor.js';
import { SyncRecovery } from './sync/sync-recovery.js';
import { SyncService } from './sync/sync.service.js';
import { OaWebhookController } from './webhooks/oa-webhook.controller.js';
import { OaWebhookService } from './webhooks/oa-webhook.service.js';
import { WebhookEventsRepository } from './webhooks/webhook-events.repository.js';
import { WebhookOutboxProcessor } from './webhooks/webhook-outbox.processor.js';

/**
 * The connector hub (capability A): adapters built by the factory, the sync
 * pipeline on BullMQ, file imports staged for that pipeline, and the OA
 * webhook endpoint with its outbox.
 */
@Module({
  imports: [EmployeesModule, MappingModule],
  controllers: [
    ConnectorsController,
    SyncRunsController,
    FileImportController,
    OaWebhookController,
  ],
  providers: [
    ConnectorFactory,
    StagedImportStore,
    FileImportService,
    ConnectorsRepository,
    ConnectorsService,
    SyncRunsRepository,
    SyncService,
    SyncRecovery,
    SyncProgressReporter,
    EmployeeSyncPipeline,
    SyncProcessor,
    BootstrapSyncService,
    WebhookEventsRepository,
    OaWebhookService,
    WebhookOutboxProcessor,
  ],
  exports: [ConnectorFactory, SyncService],
})
export class ConnectorsModule {}
