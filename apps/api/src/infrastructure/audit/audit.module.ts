import { Global, Module } from '@nestjs/common';

import { AuditLogService } from './audit-log.service.js';

/** The append-only audit writer, available to every module. */
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
