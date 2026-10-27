import type { PlatformAdmin } from '../entities/platform-admin.entity.js';
import type { PlatformAuthChallenge } from '../entities/platform-auth-challenge.entity.js';
import type {
  PlatformRefreshToken,
  PlatformSession,
  PlatformSessionRevocationReason,
} from '../entities/platform-session.entity.js';
import type { PlatformEmail } from '../value-objects/platform-email.js';
import type { PlatformSessionId } from '../value-objects/platform-session-id.js';

export const PLATFORM_AUTH_REPOSITORY = Symbol('PLATFORM_AUTH_REPOSITORY');

export type PlatformAuditEventType =
  | 'SUPER_ADMIN_BOOTSTRAPPED'
  | 'SUPER_ADMIN_CREDENTIALS_RESET'
  | 'PASSWORD_LOGIN_FAILED'
  | 'PASSWORD_VERIFIED'
  | 'TOTP_FAILED'
  | 'SESSION_CREATED'
  | 'REFRESH_TOKEN_REUSE_DETECTED'
  | 'SESSION_REVOKED'
  | 'LOGOUT'
  | 'LOGOUT_ALL_DEVICES';

export interface PlatformAuditEvent {
  readonly type: PlatformAuditEventType;
  readonly adminId: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  /** Non-sensitive context only: never credentials, codes, or tokens. */
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface NewRefreshToken {
  readonly id: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export interface RefreshTokenRotation {
  readonly sessionId: PlatformSessionId;
  readonly currentTokenId: string;
  readonly next: NewRefreshToken;
  readonly nextCsrfTokenHash: string;
  readonly now: Date;
}

/**
 * Persistence contract for platform authentication. Operations that guard
 * against races (consuming a challenge, claiming a TOTP time step, rotating a
 * refresh token) must be atomic and report whether they won.
 */
export interface PlatformAuthRepository {
  findAdminByEmail(email: PlatformEmail): Promise<PlatformAdmin | null>;
  findAdminById(id: string): Promise<PlatformAdmin | null>;
  listAdmins(): Promise<PlatformAdmin[]>;
  createAdmin(admin: PlatformAdmin): Promise<void>;
  /** Persists password hash and TOTP secret/enrollment changes. */
  saveAdminCredentials(admin: PlatformAdmin): Promise<void>;
  /**
   * Atomically makes `admin` the sole Super Admin: removes every other account,
   * revokes all sessions, consumes outstanding challenges, invalidates refresh
   * credentials, and upserts the seeded credentials. Rolls back entirely on failure.
   */
  replaceSoleSuperAdmin(
    admin: PlatformAdmin,
    now: Date,
    audit: PlatformAuditEvent,
  ): Promise<{ readonly revokedSessions: number; readonly deactivatedAdmins: number }>;
  updatePasswordHash(adminId: string, passwordHash: string): Promise<void>;
  /** Records a successful password-only sign-in (no TOTP step). */
  recordSuccessfulLogin(adminId: string, now: Date): Promise<void>;
  updateTotpSecretCiphertext(adminId: string, ciphertext: string): Promise<void>;
  /**
   * Records a successful TOTP use: stores the time step, confirms enrollment
   * and stamps the login time. Returns false if an equal or later step was
   * already used (replay).
   */
  claimTotpTimeStep(adminId: string, timeStep: number, now: Date): Promise<boolean>;

  createChallenge(challenge: PlatformAuthChallenge): Promise<void>;
  findChallengeByTokenHash(tokenHash: string): Promise<PlatformAuthChallenge | null>;
  /** Increments and returns the failed-attempt counter. */
  recordChallengeFailure(challengeId: string): Promise<number>;
  /** Marks the challenge consumed; false if it was already consumed or expired. */
  consumeChallenge(challengeId: string, now: Date): Promise<boolean>;
  /** Voids every outstanding TOTP challenge for the administrator (password-only login). */
  consumeAllPendingChallenges(adminId: string, now: Date): Promise<void>;
  deleteStaleChallenges(adminId: string, now: Date): Promise<void>;

  createSession(session: PlatformSession, refreshToken: NewRefreshToken): Promise<void>;
  findSessionById(id: PlatformSessionId): Promise<PlatformSession | null>;
  findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<{ token: PlatformRefreshToken; session: PlatformSession } | null>;
  /** Rotates atomically; false if the current token had already been rotated. */
  rotateRefreshToken(rotation: RefreshTokenRotation): Promise<boolean>;
  listActiveSessions(adminId: string, now: Date): Promise<PlatformSession[]>;
  revokeSession(
    id: PlatformSessionId,
    reason: PlatformSessionRevocationReason,
    now: Date,
  ): Promise<boolean>;
  revokeAllSessions(
    adminId: string,
    reason: PlatformSessionRevocationReason,
    now: Date,
  ): Promise<number>;

  recordAuditEvent(event: PlatformAuditEvent): Promise<void>;
}
