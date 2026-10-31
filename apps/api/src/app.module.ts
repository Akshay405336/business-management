import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware.js';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js';
import { AppConfigModule } from './config/config.module.js';
import { CacheModule } from './infrastructure/cache/cache.module.js';
import { LoggingModule } from './infrastructure/logging/logging.module.js';
import { AuthModule } from './modules/auth/index.js';
import { CrmModule } from './modules/crm/index.js';
import { ProjectsModule } from './modules/projects/index.js';
import { EmployeesModule } from './modules/employees/index.js';
import { OrgAccessModule } from './modules/org-access/index.js';
import { MediaModule } from './modules/media/index.js';
import { DailyTasksModule } from './modules/daily-tasks/index.js';
import { HealthModule } from './modules/health/health.module.js';
import { WhatsAppModule } from './modules/whatsapp/index.js';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    CacheModule,
    HealthModule,
    AuthModule,
    CrmModule,
    ProjectsModule,
    EmployeesModule,
    MediaModule,
    OrgAccessModule,
    DailyTasksModule,
    WhatsAppModule,
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
