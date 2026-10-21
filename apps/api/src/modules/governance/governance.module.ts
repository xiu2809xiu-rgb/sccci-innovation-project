import { Module } from '@nestjs/common';

import { GovernanceController } from './governance.controller.js';
import { GovernanceRepository } from './governance.repository.js';
import { GovernanceService } from './governance.service.js';

/**
 * Governance (area 4): the registers are read from the database, and the
 * access matrix from the live policy. Area 4 adds the administration, each
 * change audited, and the retention purge.
 */
@Module({
  controllers: [GovernanceController],
  providers: [GovernanceService, GovernanceRepository],
})
export class GovernanceModule {}
