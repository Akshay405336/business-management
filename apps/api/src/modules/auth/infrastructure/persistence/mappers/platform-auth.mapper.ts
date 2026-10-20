import type {
  PlatformAdmin as PlatformAdminRecord,
  PlatformAuthChallenge as PlatformAuthChallengeRecord,
  PlatformRefreshToken as PlatformRefreshTokenRecord,
  PlatformSession as PlatformSessionRecord,
} from '../../../../../generated/prisma/client.js';
import { PlatformAdmin } from '../../../domain/entities/platform-admin.entity.js';
import { PlatformAuthChallenge } from '../../../domain/entities/platform-auth-challenge.entity.js';
import {
  PlatformSession,
  type PlatformRefreshToken,
} from '../../../domain/entities/platform-session.entity.js';
import { PlatformEmail } from '../../../domain/value-objects/platform-email.js';
import { PlatformSessionId } from '../../../domain/value-objects/platform-session-id.js';

export const PlatformAuthMapper = {
  toAdmin(record: PlatformAdminRecord): PlatformAdmin {
    return PlatformAdmin.rehydrate({
      id: record.id,
      email: PlatformEmail.create(record.email),
      displayName: record.displayName,
      role: record.role,
      status: record.status,
      passwordHash: record.passwordHash,
      totpSecretCiphertext: record.totpSecretCiphertext,
      totpEnrolledAt: record.totpEnrolledAt,
      lastTotpTimeStep: record.lastTotpTimeStep === null ? null : Number(record.lastTotpTimeStep),
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  },

  toAdminCreateData(admin: PlatformAdmin) {
    return {
      id: admin.id,
      email: admin.email.value,
      displayName: admin.displayName,
      role: admin.role,
      status: admin.status,
      passwordHash: admin.passwordHash,
      totpSecretCiphertext: admin.totpSecretCiphertext,
      totpEnrolledAt: admin.totpEnrolledAt,
      lastTotpTimeStep: admin.lastTotpTimeStep === null ? null : BigInt(admin.lastTotpTimeStep),
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  },

  toChallenge(record: PlatformAuthChallengeRecord): PlatformAuthChallenge {
    return PlatformAuthChallenge.rehydrate({
      id: record.id,
      adminId: record.adminId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
      failedAttempts: record.failedAttempts,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    });
  },

  toChallengeCreateData(challenge: PlatformAuthChallenge) {
    return {
      id: challenge.id,
      adminId: challenge.adminId,
      tokenHash: challenge.tokenHash,
      expiresAt: challenge.expiresAt,
      consumedAt: challenge.consumedAt,
      failedAttempts: challenge.failedAttempts,
      ipAddress: challenge.ipAddress,
      userAgent: challenge.userAgent,
      createdAt: challenge.createdAt,
    };
  },

  toSession(record: PlatformSessionRecord): PlatformSession {
    return PlatformSession.rehydrate({
      id: PlatformSessionId.parse(record.id),
      adminId: record.adminId,
      csrfTokenHash: record.csrfTokenHash,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
      lastActiveAt: record.lastActiveAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      revokedReason: record.revokedReason,
    });
  },

  toSessionCreateData(session: PlatformSession) {
    return {
      id: session.id.value,
      adminId: session.adminId,
      csrfTokenHash: session.csrfTokenHash,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
    };
  },

  toRefreshToken(record: PlatformRefreshTokenRecord): PlatformRefreshToken {
    return {
      id: record.id,
      sessionId: record.sessionId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      rotatedAt: record.rotatedAt,
    };
  },
};
