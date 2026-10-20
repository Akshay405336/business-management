import { PLATFORM_SESSION_POLICY } from '../services/platform-session-policy.js';

export interface PlatformAuthChallengeProps {
  readonly id: string;
  readonly adminId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly failedAttempts: number;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date;
}

/**
 * Proof that an administrator passed the password step. It is short-lived,
 * single-use, and allows a bounded number of TOTP attempts.
 */
export class PlatformAuthChallenge {
  private constructor(private readonly props: PlatformAuthChallengeProps) {}

  static rehydrate(props: PlatformAuthChallengeProps): PlatformAuthChallenge {
    return new PlatformAuthChallenge(props);
  }

  static issue(input: {
    adminId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    now: Date;
  }): PlatformAuthChallenge {
    return new PlatformAuthChallenge({
      id: crypto.randomUUID(),
      adminId: input.adminId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      failedAttempts: 0,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: input.now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get adminId(): string {
    return this.props.adminId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get consumedAt(): Date | null {
    return this.props.consumedAt;
  }
  get failedAttempts(): number {
    return this.props.failedAttempts;
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

  isUsable(now: Date): boolean {
    return (
      this.props.consumedAt === null &&
      this.props.expiresAt.getTime() > now.getTime() &&
      this.props.failedAttempts < PLATFORM_SESSION_POLICY.maxTotpAttemptsPerChallenge
    );
  }
}
