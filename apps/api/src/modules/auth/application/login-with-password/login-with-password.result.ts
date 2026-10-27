import type { VerifyTotpResult } from '../verify-totp/verify-totp.result.js';

export type LoginWithPasswordTotpRequired = {
  readonly kind: 'totp_required';
  /** Opaque single-use token; the presentation layer stores it in an HttpOnly cookie. */
  readonly challengeToken: string;
  readonly challengeExpiresAt: Date;
  readonly enrollmentPending: boolean;
};

export type LoginWithPasswordSession = {
  readonly kind: 'session';
} & VerifyTotpResult;

export type LoginWithPasswordResult = LoginWithPasswordTotpRequired | LoginWithPasswordSession;
