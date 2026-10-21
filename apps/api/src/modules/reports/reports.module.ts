import { Module } from '@nestjs/common';

import { ManagementReportsController } from './management-reports.controller.js';
import { ManagementReportsRepository } from './management-reports.repository.js';
import { MockManagementReportsRepository } from './mock/mock-management-reports.repository.js';
import { ReportsService } from './reports.service.js';

/**
 * Management reports (area 3). The head start binds typed sample data; area 3
 * binds a repository that draws on the consolidated runs and the master.
 */
@Module({
  controllers: [ManagementReportsController],
  providers: [
    ReportsService,
    { provide: ManagementReportsRepository, useClass: MockManagementReportsRepository },
  ],
})
export class ReportsModule {}
