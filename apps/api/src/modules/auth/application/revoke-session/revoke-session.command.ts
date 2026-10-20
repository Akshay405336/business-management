export interface RevokeSessionCommand {
  readonly adminId: string;
  readonly currentSessionId: string;
  /** Raw identifier from the request path. */
  readonly sessionId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
