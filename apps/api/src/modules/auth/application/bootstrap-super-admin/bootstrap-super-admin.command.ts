export interface BootstrapSuperAdminCommand {
  readonly email: string;
  readonly displayName: string;
  /** Required when creating the account or when `resetPassword` is set. */
  readonly password: string | null;
  /** Replace the password of an existing Super Admin. */
  readonly resetPassword: boolean;
  /** Issue a new TOTP secret for an existing Super Admin (re-enrollment). */
  readonly rotateTotp: boolean;
}
