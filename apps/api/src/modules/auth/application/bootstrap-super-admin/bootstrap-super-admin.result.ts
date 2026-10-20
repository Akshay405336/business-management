/**
 * Operator-facing result of the bootstrap CLI. `enrollment` carries the TOTP
 * secret exactly once so the operator can register an authenticator; it must
 * never be exposed through the HTTP API.
 */
export interface BootstrapSuperAdminResult {
  /** `password_required`: nothing was changed because a password must be supplied. */
  readonly outcome: 'created' | 'unchanged' | 'updated' | 'password_required';
  readonly adminId: string | null;
  readonly email: string;
  readonly totpEnrolled: boolean;
  readonly passwordReset: boolean;
  readonly revokedSessions: number;
  readonly enrollment: { readonly otpauthUri: string; readonly secret: string } | null;
}
