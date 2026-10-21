import { Module, RequestMethod, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { GlobalRateLimitMiddleware } from './common/middleware/global-rate-limit.middleware.js';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware.js';
import { AppConfigModule } from './config/config.module.js';
import { CacheModule } from './infrastructure/cache/cache.module.js';
import { LoggingModule } from './infrastructure/logging/logging.module.js';
import { AuthModule } from './modules/auth/index.js';
import { CrmModule } from './modules/crm/index.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [AppConfigModule, LoggingModule, CacheModule, HealthModule, AuthModule, CrmModule],
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
      )
      .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
  }
}
