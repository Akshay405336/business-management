export interface VerifyTotpCommand {
  /** Challenge token from the HttpOnly challenge cookie, if present. */
  readonly challengeToken: string | null;
  readonly code: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
