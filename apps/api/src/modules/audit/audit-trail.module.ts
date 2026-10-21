import { Module } from '@nestjs/common';

import { AuditTrailController } from './audit-trail.controller.js';
import { AuditTrailRepository } from './audit-trail.repository.js';
import { AuditTrailService } from './audit-trail.service.js';

/**
 * The audit-log viewer's API (area 4). The writer is the global AuditModule
 * in `infrastructure/audit`; this module only reads.
 */
@Module({
  controllers: [AuditTrailController],
  providers: [AuditTrailService, AuditTrailRepository],
})
export class AuditTrailModule {}
