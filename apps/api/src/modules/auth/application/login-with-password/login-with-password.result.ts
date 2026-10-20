export interface LoginWithPasswordResult {
  /** Opaque single-use token; the presentation layer stores it in an HttpOnly cookie. */
  readonly challengeToken: string;
  readonly challengeExpiresAt: Date;
  readonly enrollmentPending: boolean;
}
