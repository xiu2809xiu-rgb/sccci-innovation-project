import { Module, type DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { FieldMaskingInterceptor } from './common/interceptors/field-masking.interceptor.js';
import { MockDataInterceptor } from './common/interceptors/mock-data.interceptor.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { AppConfig } from './config/app-config.js';
import { ConfigModule } from './config/config.module.js';
import { AuditModule } from './infrastructure/audit/audit.module.js';
import { EventsModule } from './infrastructure/events/events.module.js';
import { LlmModule } from './infrastructure/llm/llm.module.js';
import { LoggingModule } from './infrastructure/logging/logging.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { QueuesModule } from './infrastructure/queues/queues.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { AccessModule } from './modules/access/access.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AttendanceLeaveModule } from './modules/attendance-leave/attendance-leave.module.js';
import { AuditTrailModule } from './modules/audit/audit-trail.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ConnectorsModule } from './modules/connectors/connectors.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { GovernanceModule } from './modules/governance/governance.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MappingModule } from './modules/mapping/mapping.module.js';
import { OverviewModule } from './modules/overview/overview.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkflowsModule } from './modules/workflows/workflows.module.js';

/**
 * Root module: platform infrastructure first, then the domain modules. Global
 * guards run in order: rate limit, authenticate, CSRF, permissions.
 */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggingModule,
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
        PrismaModule,
        RedisModule,
        QueuesModule,
        AuditModule,
        EventsModule,
        LlmModule,
        AccessModule,
        AuthModule.forRoot({ demoMode: config.auth.demoMode }),
        UsersModule,
        HealthModule,
        AnalyticsModule,
        OverviewModule,
        EmployeesModule,
        MappingModule,
        ConnectorsModule,
        WorkflowsModule,
        AttendanceLeaveModule,
        ReportsModule,
        GovernanceModule,
        AuditTrailModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: FieldMaskingInterceptor },
        { provide: APP_INTERCEPTOR, useClass: MockDataInterceptor },
        { provide: APP_PIPE, useFactory: createValidationPipe },
      ],
    };
  }
}
