import type { IssuedPlatformSession } from '../verify-totp/verify-totp.result.js';

/** Rotated credentials: a new access token, refresh token and CSRF token. */
export type RefreshSessionResult = IssuedPlatformSession;
