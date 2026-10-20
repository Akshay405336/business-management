export interface RevokeSessionResult {
  readonly sessionId: string;
  /** True when the caller revoked the session it is using right now. */
  readonly wasCurrentSession: boolean;
}
