export interface LogoutResult {
  /** False when there was no live session to revoke (logout is idempotent). */
  readonly revoked: boolean;
}
