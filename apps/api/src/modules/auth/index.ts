export { AuthModule } from './auth.module.js';
export {
  requiresTotpForLogin,
  requiresSuperAdminTotp,
} from './domain/services/platform-totp-policy.js';
export { CurrentPlatformAuth } from './presentation/http/guards/current-platform-auth.decorator.js';
export {
  PlatformAdminGuard,
  type PlatformAuthContext,
  type PlatformAuthenticatedRequest,
} from './presentation/http/guards/platform-admin.guard.js';
