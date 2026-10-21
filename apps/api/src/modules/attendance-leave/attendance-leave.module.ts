import { Module } from '@nestjs/common';

import { AttendanceLeaveService } from './attendance-leave.service.js';
import { ConsolidationRunsController } from './consolidation-runs.controller.js';
import { ConsolidationRepository } from './consolidation.repository.js';
import { LeaveCategoryMappingsController } from './leave-category-mappings.controller.js';
import { LeaveCategoryMappingsRepository } from './leave-category-mappings.repository.js';
import { MockConsolidationRepository } from './mock/mock-consolidation.repository.js';
import { ReportTemplateController } from './report-template.controller.js';
import { ReportTemplatesRepository } from './report-templates.repository.js';

/**
 * Attendance, leave and consolidation (area 3). The rules and the template are
 * read from the database; runs and template rows come from typed sample data
 * until area 3 binds its own repository here and builds ingestion, the
 * category mappers, validation and the renderer.
 */
@Module({
  controllers: [
    ConsolidationRunsController,
    LeaveCategoryMappingsController,
    ReportTemplateController,
  ],
  providers: [
    AttendanceLeaveService,
    LeaveCategoryMappingsRepository,
    ReportTemplatesRepository,
    { provide: ConsolidationRepository, useClass: MockConsolidationRepository },
  ],
})
export class AttendanceLeaveModule {}
