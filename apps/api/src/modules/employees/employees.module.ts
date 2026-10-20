import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module.js';
import { ConflictsController } from './conflicts.controller.js';
import { ConflictsRepository } from './conflicts.repository.js';
import { ConflictsService } from './conflicts.service.js';
import { EmployeeMasterService } from './employee-master.service.js';
import { EmployeesController } from './employees.controller.js';
import { EmployeesRepository } from './employees.repository.js';
import { EmployeesService } from './employees.service.js';

/** The canonical employee master: merges from syncs, masked reads, and conflict resolution. */
@Module({
  imports: [AiModule],
  controllers: [EmployeesController, ConflictsController],
  providers: [
    EmployeesRepository,
    EmployeeMasterService,
    EmployeesService,
    ConflictsRepository,
    ConflictsService,
  ],
  exports: [EmployeeMasterService, EmployeesRepository],
})
export class EmployeesModule {}
