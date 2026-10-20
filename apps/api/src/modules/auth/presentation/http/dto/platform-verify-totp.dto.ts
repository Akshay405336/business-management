import type {
  PlatformAccessTokenResponse,
  PlatformAdminProfile,
  PlatformCurrentSessionResponse,
  PlatformSessionSummary,
  PlatformVerifyTotpResponse,
} from '@techwin/contracts';
import type { PlatformVerifyTotpRequest } from '@techwin/validation';
import type {
  GetCurrentSessionResult,
  PlatformAdminView,
  PlatformSessionView,
} from '../../../application/get-current-session/get-current-session.result.js';
import type {
  IssuedPlatformSession,
  VerifyTotpResult,
} from '../../../application/verify-totp/verify-totp.result.js';

/** Validated body of `POST /auth/platform/verify-totp` (see `platformVerifyTotpBodySchema`). */
export type PlatformVerifyTotpDto = PlatformVerifyTotpRequest;

export const toAdminProfile = (admin: PlatformAdminView): PlatformAdminProfile => ({
  id: admin.id,
  email: admin.email,
  displayName: admin.displayName,
  role: admin.role,
  lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
});

export const toSessionSummary = (session: PlatformSessionView): PlatformSessionSummary => ({
  id: session.id,
  createdAt: session.createdAt.toISOString(),
  lastActiveAt: session.lastActiveAt.toISOString(),
  expiresAt: session.expiresAt.toISOString(),
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  current: session.current,
});

/** Refresh and CSRF tokens are set as cookies and deliberately left out here. */
export const toAccessTokenResponse = (
  issued: IssuedPlatformSession,
): PlatformAccessTokenResponse => ({
  tokenType: 'Bearer',
  accessToken: issued.accessToken,
  accessTokenExpiresAt: issued.accessTokenExpiresAt.toISOString(),
  sessionId: issued.sessionId,
  sessionExpiresAt: issued.sessionExpiresAt.toISOString(),
});

export const toVerifyTotpResponse = (result: VerifyTotpResult): PlatformVerifyTotpResponse => ({
  ...toAccessTokenResponse(result),
  admin: toAdminProfile(result.admin),
});

export const toCurrentSessionResponse = (
  result: GetCurrentSessionResult,
): PlatformCurrentSessionResponse => ({
  admin: toAdminProfile(result.admin),
  session: toSessionSummary(result.session),
});
