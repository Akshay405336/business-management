import type { PlatformLoginResponse } from '@techwin/contracts';
import type { PlatformLoginRequest } from '@techwin/validation';
import type { LoginWithPasswordResult } from '../../../application/login-with-password/login-with-password.result.js';
import { toVerifyTotpResponse } from './platform-verify-totp.dto.js';

/** Validated body of `POST /auth/platform/login` (see `platformLoginBodySchema`). */
export type PlatformLoginDto = PlatformLoginRequest;

/** Maps the login use case to the HTTP response (TOTP challenge or completed session). */
export const toPlatformLoginResponse = (result: LoginWithPasswordResult): PlatformLoginResponse => {
  if (result.kind === 'session') {
    return { status: 'authenticated', ...toVerifyTotpResponse(result) };
  }
  return {
    status: 'totp_required',
    challengeExpiresAt: result.challengeExpiresAt.toISOString(),
    enrollmentPending: result.enrollmentPending,
  };
};
