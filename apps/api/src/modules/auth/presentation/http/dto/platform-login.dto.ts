import type { PlatformLoginResponse } from '@techwin/contracts';
import type { PlatformLoginRequest } from '@techwin/validation';
import type { LoginWithPasswordResult } from '../../../application/login-with-password/login-with-password.result.js';

/** Validated body of `POST /auth/platform/login` (see `platformLoginBodySchema`). */
export type PlatformLoginDto = PlatformLoginRequest;

/** The challenge token travels only in its HttpOnly cookie, never in the body. */
export const toPlatformLoginResponse = (
  result: LoginWithPasswordResult,
): PlatformLoginResponse => ({
  status: 'totp_required',
  challengeExpiresAt: result.challengeExpiresAt.toISOString(),
  enrollmentPending: result.enrollmentPending,
});
