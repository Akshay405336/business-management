import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import type { PlatformAdmin } from '../../../domain/entities/platform-admin.entity.js';
import type { PlatformAuthChallenge } from '../../../domain/entities/platform-auth-challenge.entity.js';
import type {
  PlatformRefreshToken,
  PlatformSession,
  PlatformSessionRevocationReason,
} from '../../../domain/entities/platform-session.entity.js';
import type {
  NewRefreshToken,
  PlatformAuditEvent,
  PlatformAuthRepository,
  RefreshTokenRotation,
} from '../../../domain/repositories/platform-auth.repository.js';
import type { PlatformEmail } from '../../../domain/value-objects/platform-email.js';
import type { PlatformSessionId } from '../../../domain/value-objects/platform-session-id.js';
import { PlatformAuthMapper } from '../mappers/platform-auth.mapper.js';

/** Consumed or expired challenges are kept briefly for audit, then purged. */
const STALE_CHALLENGE_RETENTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PrismaPlatformAuthRepository implements PlatformAuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAdminByEmail(email: PlatformEmail): Promise<PlatformAdmin | null> {
    const record = await this.prisma.platformAdmin.findUnique({ where: { email: email.value } });
    return record ? PlatformAuthMapper.toAdmin(record) : null;
  }

  async findAdminById(id: string): Promise<PlatformAdmin | null> {
    const record = await this.prisma.platformAdmin.findUnique({ where: { id } });
    return record ? PlatformAuthMapper.toAdmin(record) : null;
  }

  async listAdmins(): Promise<PlatformAdmin[]> {
    const records = await this.prisma.platformAdmin.findMany({ orderBy: { createdAt: 'asc' } });
    return records.map((record) => PlatformAuthMapper.toAdmin(record));
  }

  async createAdmin(admin: PlatformAdmin): Promise<void> {
    await this.prisma.platformAdmin.create({ data: PlatformAuthMapper.toAdminCreateData(admin) });
  }

  async saveAdminCredentials(admin: PlatformAdmin): Promise<void> {
    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        passwordHash: admin.passwordHash,
        totpSecretCiphertext: admin.totpSecretCiphertext,
        totpEnrolledAt: admin.totpEnrolledAt,
        lastTotpTimeStep: admin.lastTotpTimeStep === null ? null : BigInt(admin.lastTotpTimeStep),
      },
    });
  }

  async replaceSoleSuperAdmin(
    admin: PlatformAdmin,
    now: Date,
    audit: PlatformAuditEvent,
  ): Promise<{ revokedSessions: number; deactivatedAdmins: number }> {
    return this.prisma.$transaction(async (tx) => {
      const others = await tx.platformAdmin.findMany({
        where: { id: { not: admin.id } },
        select: { id: true },
      });
      const allAdminIds = [admin.id, ...others.map((row) => row.id)];

      await tx.platformAuthChallenge.updateMany({
        where: { adminId: { in: allAdminIds }, consumedAt: null },
        data: { consumedAt: now },
      });

      await tx.platformRefreshToken.updateMany({
        where: { rotatedAt: null, session: { adminId: { in: allAdminIds } } },
        data: { rotatedAt: now },
      });

      const revoked = await tx.platformSession.updateMany({
        where: { adminId: { in: allAdminIds }, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'CREDENTIALS_RESET' },
      });

      const removed = await tx.platformAdmin.deleteMany({
        where: { id: { not: admin.id } },
      });

      await tx.platformAdmin.upsert({
        where: { id: admin.id },
        create: PlatformAuthMapper.toAdminCreateData(admin),
        update: {
          email: admin.email.value,
          displayName: admin.displayName,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          passwordHash: admin.passwordHash,
          totpSecretCiphertext: admin.totpSecretCiphertext,
          totpEnrolledAt: admin.totpEnrolledAt,
          lastTotpTimeStep: admin.lastTotpTimeStep === null ? null : BigInt(admin.lastTotpTimeStep),
          lastLoginAt: null,
        },
      });

      await tx.platformAuditEvent.create({
        data: {
          type: audit.type,
          adminId: audit.adminId,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          ...(audit.metadata ? { metadata: { ...audit.metadata } } : {}),
        },
      });

      const activeCount = await tx.platformAdmin.count({
        where: { status: 'ACTIVE', role: 'SUPER_ADMIN' },
      });
      if (activeCount !== 1) {
        throw new Error('Seed did not leave exactly one active Platform Super Admin.');
      }

      return { revokedSessions: revoked.count, deactivatedAdmins: removed.count };
    });
  }

  async updatePasswordHash(adminId: string, passwordHash: string): Promise<void> {
    await this.prisma.platformAdmin.update({ where: { id: adminId }, data: { passwordHash } });
  }

  async recordSuccessfulLogin(adminId: string, now: Date): Promise<void> {
    await this.prisma.platformAdmin.update({
      where: { id: adminId },
      data: { lastLoginAt: now, updatedAt: now },
    });
  }

  async updateTotpSecretCiphertext(adminId: string, ciphertext: string): Promise<void> {
    await this.prisma.platformAdmin.update({
      where: { id: adminId },
      data: { totpSecretCiphertext: ciphertext },
    });
  }

  async claimTotpTimeStep(adminId: string, timeStep: number, now: Date): Promise<boolean> {
    const step = BigInt(timeStep);
    const updated = await this.prisma.$executeRaw`
      UPDATE platform_admins
         SET last_totp_time_step = ${step},
             totp_enrolled_at    = COALESCE(totp_enrolled_at, ${now}),
             last_login_at       = ${now},
             updated_at          = ${now}
       WHERE id = ${adminId}::uuid
         AND (last_totp_time_step IS NULL OR last_totp_time_step < ${step})`;
    return updated === 1;
  }

  async createChallenge(challenge: PlatformAuthChallenge): Promise<void> {
    await this.prisma.platformAuthChallenge.create({
      data: PlatformAuthMapper.toChallengeCreateData(challenge),
    });
  }

  async findChallengeByTokenHash(tokenHash: string): Promise<PlatformAuthChallenge | null> {
    const record = await this.prisma.platformAuthChallenge.findUnique({ where: { tokenHash } });
    return record ? PlatformAuthMapper.toChallenge(record) : null;
  }

  async recordChallengeFailure(challengeId: string): Promise<number> {
    const record = await this.prisma.platformAuthChallenge.update({
      where: { id: challengeId },
      data: { failedAttempts: { increment: 1 } },
      select: { failedAttempts: true },
    });
    return record.failedAttempts;
  }

  async consumeChallenge(challengeId: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.platformAuthChallenge.updateMany({
      where: { id: challengeId, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    return count === 1;
  }

  async consumeAllPendingChallenges(adminId: string, now: Date): Promise<void> {
    await this.prisma.platformAuthChallenge.updateMany({
      where: { adminId, consumedAt: null },
      data: { consumedAt: now },
    });
  }

  async deleteStaleChallenges(adminId: string, now: Date): Promise<void> {
    const cutoff = new Date(now.getTime() - STALE_CHALLENGE_RETENTION_MS);
    await this.prisma.platformAuthChallenge.deleteMany({
      where: { adminId, OR: [{ expiresAt: { lt: cutoff } }, { consumedAt: { lt: cutoff } }] },
    });
  }

  async createSession(session: PlatformSession, refreshToken: NewRefreshToken): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.platformSession.create({ data: PlatformAuthMapper.toSessionCreateData(session) }),
      this.prisma.platformRefreshToken.create({
        data: {
          id: refreshToken.id,
          sessionId: session.id.value,
          tokenHash: refreshToken.tokenHash,
          expiresAt: refreshToken.expiresAt,
        },
      }),
    ]);
  }

  async findSessionById(id: PlatformSessionId): Promise<PlatformSession | null> {
    const record = await this.prisma.platformSession.findUnique({ where: { id: id.value } });
    return record ? PlatformAuthMapper.toSession(record) : null;
  }

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<{ token: PlatformRefreshToken; session: PlatformSession } | null> {
    const record = await this.prisma.platformRefreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });
    if (!record) return null;
    return {
      token: PlatformAuthMapper.toRefreshToken(record),
      session: PlatformAuthMapper.toSession(record.session),
    };
  }

  async rotateRefreshToken(rotation: RefreshTokenRotation): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.platformRefreshToken.updateMany({
        where: { id: rotation.currentTokenId, rotatedAt: null },
        data: { rotatedAt: rotation.now },
      });
      if (count !== 1) return false;

      await tx.platformRefreshToken.create({
        data: {
          id: rotation.next.id,
          sessionId: rotation.sessionId.value,
          tokenHash: rotation.next.tokenHash,
          expiresAt: rotation.next.expiresAt,
        },
      });
      await tx.platformSession.update({
        where: { id: rotation.sessionId.value },
        data: {
          csrfTokenHash: rotation.nextCsrfTokenHash,
          lastActiveAt: rotation.now,
          expiresAt: rotation.next.expiresAt,
        },
      });
      return true;
    });
  }

  async listActiveSessions(adminId: string, now: Date): Promise<PlatformSession[]> {
    const records = await this.prisma.platformSession.findMany({
      where: { adminId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastActiveAt: 'desc' },
    });
    return records.map((record) => PlatformAuthMapper.toSession(record));
  }

  async revokeSession(
    id: PlatformSessionId,
    reason: PlatformSessionRevocationReason,
    now: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.platformSession.updateMany({
      where: { id: id.value, revokedAt: null },
      data: { revokedAt: now, revokedReason: reason },
    });
    return count === 1;
  }

  async revokeAllSessions(
    adminId: string,
    reason: PlatformSessionRevocationReason,
    now: Date,
  ): Promise<number> {
    const { count } = await this.prisma.platformSession.updateMany({
      where: { adminId, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, revokedReason: reason },
    });
    return count;
  }

  async recordAuditEvent(event: PlatformAuditEvent): Promise<void> {
    await this.prisma.platformAuditEvent.create({
      data: {
        type: event.type,
        adminId: event.adminId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        ...(event.metadata ? { metadata: { ...event.metadata } } : {}),
      },
    });
  }
}
