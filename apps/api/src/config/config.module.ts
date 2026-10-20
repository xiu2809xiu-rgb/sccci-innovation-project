import { Global, Module, type DynamicModule } from '@nestjs/common';

import { AppConfig } from './app-config.js';

/** Provides the validated {@link AppConfig} to the whole application. */
@Global()
@Module({})
export class ConfigModule {
  /** Uses the given config (tests) or builds one from `process.env` (the app). */
  static forRoot(config: AppConfig = AppConfig.fromEnv(process.env)): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: AppConfig, useValue: config }],
      exports: [AppConfig],
    };
  }
}
