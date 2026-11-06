import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware.js';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js';
import { AppConfigModule } from './config/config.module.js';
import { CacheModule } from './infrastructure/cache/cache.module.js';
import { LoggingModule } from './infrastructure/logging/logging.module.js';
import { AuthModule } from './modules/auth/index.js';
import { CrmModule } from './modules/crm/index.js';
import { ProjectManagementModule } from './modules/project-management/index.js';
import { EmployeesModule } from './modules/employees/index.js';
import { OrgAccessModule } from './modules/org-access/index.js';
import { MediaModule } from './modules/media/index.js';
import { HealthModule } from './modules/health/health.module.js';
import { WhatsAppModule } from './modules/whatsapp/index.js';
import { AttendanceModule } from './modules/attendance/index.js';
import { OrganizationCalendarModule } from './modules/organization-calendar/index.js';
import { LeaveModule } from './modules/leave/index.js';
import { TenantContextModule } from './platform/tenant-context/tenant-context.module.js';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    CacheModule,
    HealthModule,
    AuthModule,
    TenantContextModule,
    CrmModule,
    ProjectManagementModule,
    EmployeesModule,
    MediaModule,
    OrgAccessModule,
    WhatsAppModule,
    AttendanceModule,
    OrganizationCalendarModule,
    LeaveModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(OriginCheckMiddleware)
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
    consumer
      .apply(GlobalRateLimitMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'ready', method: RequestMethod.GET },
        // Meta delivers from shared IPs; the webhook has its own per-channel limit.
        { path: 'webhooks/whatsapp/{*splat}', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}
