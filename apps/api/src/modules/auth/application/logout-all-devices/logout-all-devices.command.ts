export interface LogoutAllDevicesCommand {
  readonly adminId: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}
