export { AuthModule } from './auth.module.js';
export {
  requiresTotpForLogin,
  requiresSuperAdminTotp,
} from './domain/services/platform-totp-policy.js';
export { PlatformAuthExceptionFilter } from './presentation/http/filters/platform-auth-exception.filter.js';
export { CurrentPlatformAuth } from './presentation/http/guards/current-platform-auth.decorator.js';
export {
  PlatformAdminGuard,
  type PlatformAuthContext,
  type PlatformAuthenticatedRequest,
} from './presentation/http/guards/platform-admin.guard.js';
export {
  PLATFORM_TOTP_SECRET_PROTECTOR,
  type PlatformTotpSecretProtector,
} from './domain/services/platform-totp-secret-protector.js';
export { PlatformTotpSecret } from './domain/value-objects/platform-totp-secret.js';
