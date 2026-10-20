/**
 * Operator-facing result of environment-synchronized seeding. `enrollment`
 * carries the TOTP secret exactly once; it must never be exposed through HTTP.
 */
export interface SynchronizeSuperAdminResult {
  readonly outcome: 'created' | 'updated';
  readonly adminId: string;
  readonly email: string;
  readonly revokedSessions: number;
  readonly deactivatedAdmins: number;
  readonly enrollment: { readonly otpauthUri: string; readonly secret: string };
}
