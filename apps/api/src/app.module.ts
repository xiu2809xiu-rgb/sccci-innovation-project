import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health/health.module.js';

/** Root module: composes the platform infrastructure and the domain modules. */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
