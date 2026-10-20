export interface RefreshSessionCommand {
  /** Refresh token from the HttpOnly refresh cookie, if present. */
  readonly refreshToken: string | null;
  /** CSRF token echoed by the client in the request header. */
  readonly csrfToken: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
