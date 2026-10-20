export type PlatformAdminRole = 'SUPER_ADMIN';

export interface PlatformAdminProfile {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: PlatformAdminRole;
  readonly lastLoginAt: string | null;
}

export interface PlatformSessionSummary {
  readonly id: string;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly expiresAt: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly current: boolean;
}

/** Returned after a successful password check. No session exists yet. */
export interface PlatformLoginResponse {
  readonly status: 'totp_required';
  readonly challengeExpiresAt: string;
  /** True when the authenticator has not been confirmed yet (first sign-in). */
  readonly enrollmentPending: boolean;
}

export interface PlatformAccessTokenResponse {
  readonly tokenType: 'Bearer';
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly sessionId: string;
  readonly sessionExpiresAt: string;
}

export interface PlatformVerifyTotpResponse extends PlatformAccessTokenResponse {
  readonly admin: PlatformAdminProfile;
}

export type PlatformRefreshResponse = PlatformAccessTokenResponse;

export interface PlatformCurrentSessionResponse {
  readonly admin: PlatformAdminProfile;
  readonly session: PlatformSessionSummary;
}

export interface PlatformSessionListResponse {
  readonly sessions: readonly PlatformSessionSummary[];
}

export interface PlatformLogoutAllResponse {
  readonly revokedSessions: number;
}
