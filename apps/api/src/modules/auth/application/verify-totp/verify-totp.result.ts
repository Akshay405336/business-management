import type { PlatformAdminView } from '../get-current-session/get-current-session.result.js';

/**
 * Credentials for a freshly established session. The refresh and CSRF tokens
 * are delivered to the browser as cookies by the presentation layer and are
 * never part of a response body.
 */
export interface IssuedPlatformSession {
  readonly sessionId: string;
  readonly sessionExpiresAt: Date;
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly csrfToken: string;
}

export interface VerifyTotpResult extends IssuedPlatformSession {
  readonly admin: PlatformAdminView;
}
