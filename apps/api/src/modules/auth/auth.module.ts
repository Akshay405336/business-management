import { Module, type Provider } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { JwtSecurityModule } from '../../infrastructure/security/jwt/jwt-security.module.js';
import { OpaqueTokenModule } from '../../infrastructure/security/opaque-tokens/opaque-token.module.js';
import { PasswordHashingModule } from '../../infrastructure/security/password-hashing/password-hashing.module.js';
import { RATE_LIMITER } from '../../infrastructure/security/security.contracts.js';
import { TotpModule } from '../../infrastructure/security/totp/totp.module.js';
import { BootstrapSuperAdminHandler } from './application/bootstrap-super-admin/bootstrap-super-admin.handler.js';
import { SynchronizeSuperAdminHandler } from './application/synchronize-super-admin/synchronize-super-admin.handler.js';
import { GetCurrentSessionHandler } from './application/get-current-session/get-current-session.handler.js';
import { ListSessionsHandler } from './application/list-sessions/list-sessions.handler.js';
import { LoginWithPasswordHandler } from './application/login-with-password/login-with-password.handler.js';
import { LogoutAllDevicesHandler } from './application/logout-all-devices/logout-all-devices.handler.js';
import { LogoutHandler } from './application/logout/logout.handler.js';
import { RefreshSessionHandler } from './application/refresh-session/refresh-session.handler.js';
import { RevokeSessionHandler } from './application/revoke-session/revoke-session.handler.js';
import { VerifyTotpHandler } from './application/verify-totp/verify-totp.handler.js';
import { PLATFORM_AUTH_REPOSITORY } from './domain/repositories/platform-auth.repository.js';
import { PLATFORM_TOTP_SECRET_PROTECTOR } from './domain/services/platform-totp-secret-protector.js';
import { PrismaPlatformAuthRepository } from './infrastructure/persistence/prisma/prisma-platform-auth.repository.js';
import { PlatformRateLimiterAdapter } from './infrastructure/platform-rate-limiter.adapter.js';
import { PlatformTotpSecretResolver } from './infrastructure/totp/platform-totp-secret-resolver.js';
import { PlatformAuthController } from './presentation/http/controllers/platform-auth.controller.js';
import { PlatformAuthCookies } from './presentation/http/cookies/platform-auth.cookies.js';
import { PlatformAuthExceptionFilter } from './presentation/http/filters/platform-auth-exception.filter.js';
import { PlatformAdminGuard } from './presentation/http/guards/platform-admin.guard.js';

/** Bindings for the domain contracts; shared with the bootstrap CLI context. */
export const platformAuthPersistenceProviders: Provider[] = [
  { provide: PLATFORM_AUTH_REPOSITORY, useClass: PrismaPlatformAuthRepository },
  { provide: PLATFORM_TOTP_SECRET_PROTECTOR, useClass: PlatformTotpSecretResolver },
];

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    JwtSecurityModule,
    PasswordHashingModule,
    TotpModule,
    OpaqueTokenModule,
  ],
  controllers: [PlatformAuthController],
  providers: [
    ...platformAuthPersistenceProviders,
    // Auth use cases get the fail-closed, key-hashing limiter.
    { provide: RATE_LIMITER, useClass: PlatformRateLimiterAdapter },
    BootstrapSuperAdminHandler,
    SynchronizeSuperAdminHandler,
    LoginWithPasswordHandler,
    VerifyTotpHandler,
    RefreshSessionHandler,
    GetCurrentSessionHandler,
    ListSessionsHandler,
    RevokeSessionHandler,
    LogoutHandler,
    LogoutAllDevicesHandler,
    PlatformAuthCookies,
    PlatformAuthExceptionFilter,
    PlatformAdminGuard,
  ],
  // Other modules protect routes with PlatformAdminGuard, which needs these.
  exports: [PlatformAdminGuard, GetCurrentSessionHandler, JwtSecurityModule],
})
export class AuthModule {}
