export interface LogoutCommand {
  /** Refresh token from the HttpOnly cookie, when the browser still has it. */
  readonly refreshToken: string | null;
  readonly csrfToken: string | null;
  /** Session id from a verified access token, used when no cookie is present. */
  readonly accessTokenSessionId: string | null;
  readonly accessTokenAdminId: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
