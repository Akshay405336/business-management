export interface LoginWithPasswordCommand {
  readonly email: string;
  readonly password: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
