import { SessionExpiredError } from '../errors/platform-auth.errors.js';
import type { PlatformSessionId } from '../value-objects/platform-session-id.js';

export type PlatformSessionRevocationReason =
  'LOGOUT' | 'LOGOUT_ALL' | 'REVOKED' | 'REFRESH_TOKEN_REUSE' | 'CREDENTIALS_RESET';

export interface PlatformSessionProps {
  readonly id: PlatformSessionId;
  readonly adminId: string;
  readonly csrfTokenHash: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: PlatformSessionRevocationReason | null;
}

export class PlatformSession {
  private constructor(private readonly props: PlatformSessionProps) {}

  static rehydrate(props: PlatformSessionProps): PlatformSession {
    return new PlatformSession(props);
  }

  static start(input: {
    id: PlatformSessionId;
    adminId: string;
    csrfTokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    now: Date;
    expiresAt: Date;
  }): PlatformSession {
    return new PlatformSession({
      id: input.id,
      adminId: input.adminId,
      csrfTokenHash: input.csrfTokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: input.now,
      lastActiveAt: input.now,
      expiresAt: input.expiresAt,
      revokedAt: null,
      revokedReason: null,
    });
  }

  get id(): PlatformSessionId {
    return this.props.id;
  }
  get adminId(): string {
    return this.props.adminId;
  }
  get csrfTokenHash(): string {
    return this.props.csrfTokenHash;
  }
  get ipAddress(): string | null {
    return this.props.ipAddress;
  }
  get userAgent(): string | null {
    return this.props.userAgent;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get lastActiveAt(): Date {
    return this.props.lastActiveAt;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
  get revokedReason(): PlatformSessionRevocationReason | null {
    return this.props.revokedReason;
  }

  isActive(now: Date): boolean {
    return this.props.revokedAt === null && this.props.expiresAt.getTime() > now.getTime();
  }

  ensureActive(now: Date): void {
    if (!this.isActive(now)) throw new SessionExpiredError();
  }

  belongsTo(adminId: string): boolean {
    return this.props.adminId === adminId;
  }
}

/** One link in a session's refresh-token rotation chain. */
export interface PlatformRefreshToken {
  readonly id: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
}

export const isRefreshTokenUsable = (token: PlatformRefreshToken, now: Date): boolean =>
  token.rotatedAt === null && token.expiresAt.getTime() > now.getTime();
