import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_ROUTES,
  type WhatsAppChannelStatus,
  type WhatsAppChannelSummary,
} from '@techwin/contracts';
import type { WhatsAppChannel } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { WhatsAppConflictError, WhatsAppNotFoundError } from '../../domain/whatsapp.errors.js';
import {
  WHATSAPP_CREDENTIAL_CIPHER,
  WHATSAPP_SETTINGS,
  type ProviderPhoneNumberInfo,
  type WhatsAppCredentialCipherPort,
  type WhatsAppSettings,
} from '../../domain/whatsapp.ports.js';
import { recordAudit } from './whatsapp-persistence.shared.js';

const aad = (channelId: string, field: 'access_token' | 'app_secret') =>
  `whatsapp-channel:${channelId}:${field}`;

const hashVerifyToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

function deriveStatus(
  row: Pick<
    WhatsAppChannel,
    'deletedAt' | 'disconnectedAt' | 'lastErrorMessage' | 'lastVerifiedAt' | 'webhookVerifiedAt'
  >,
): WhatsAppChannelStatus {
  if (row.deletedAt || row.disconnectedAt) return 'DISCONNECTED';
  if (row.lastErrorMessage) return 'CONNECTION_ERROR';
  if (!row.lastVerifiedAt) return 'PENDING_SETUP';
  if (!row.webhookVerifiedAt) return 'WEBHOOK_NOT_VERIFIED';
  return 'CONNECTED';
}

@Injectable()
export class PrismaWhatsAppChannelStore {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WHATSAPP_CREDENTIAL_CIPHER) private readonly cipher: WhatsAppCredentialCipherPort,
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
  ) {}

  private webhookUrl(webhookKey: string): string {
    const path = WHATSAPP_ROUTES.webhook(webhookKey);
    return this.settings.webhookBaseUrl ? `${this.settings.webhookBaseUrl}${path}` : path;
  }

  private toSummary(row: WhatsAppChannel, conversationCount: number): WhatsAppChannelSummary {
    return {
      id: row.id,
      name: row.name,
      status: deriveStatus(row),
      connectionMethod: row.connectionMethod,
      businessAccountId: row.businessAccountId,
      phoneNumberId: row.phoneNumberId,
      displayPhoneNumber: row.displayPhoneNumber,
      verifiedName: row.verifiedName,
      qualityRating: row.qualityRating,
      messagingLimitTier: row.messagingLimitTier,
      webhookUrl: this.webhookUrl(row.webhookKey),
      accessTokenMasked: row.accessTokenLast4 ? `••••••••${row.accessTokenLast4}` : null,
      hasAppSecret: row.appSecretCiphertext !== null,
      hasVerifyToken: row.verifyTokenHash !== null,
      credentialsUpdatedAt: row.credentialsUpdatedAt?.toISOString() ?? null,
      lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
      webhookVerifiedAt: row.webhookVerifiedAt?.toISOString() ?? null,
      lastWebhookAt: row.lastWebhookAt?.toISOString() ?? null,
      templatesSyncedAt: row.templatesSyncedAt?.toISOString() ?? null,
      lastErrorCode: row.lastErrorCode,
      lastErrorMessage: row.lastErrorMessage,
      conversationCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async syncStatus(id: string): Promise<void> {
    const row = await this.prisma.whatsAppChannel.findUnique({ where: { id } });
    if (!row) return;
    const status = deriveStatus(row);
    if (status !== row.status) {
      await this.prisma.whatsAppChannel.update({ where: { id }, data: { status } });
    }
  }

  private async findActiveRow(organizationId: string, id: string): Promise<WhatsAppChannel> {
    const row = await this.prisma.whatsAppChannel.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!row) throw new WhatsAppNotFoundError('WhatsApp channel');
    return row;
  }

  private decrypt(row: WhatsAppChannel, field: 'access_token' | 'app_secret'): string | null {
    const envelope = field === 'access_token' ? row.accessTokenCiphertext : row.appSecretCiphertext;
    return envelope ? this.cipher.open(envelope, aad(row.id, field)) : null;
  }

  async list(organizationId: string): Promise<readonly WhatsAppChannelSummary[]> {
    const rows = await this.prisma.whatsAppChannel.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { conversations: true } } },
    });
    return rows.map((row) => this.toSummary(row, row._count.conversations));
  }

  async getSummary(organizationId: string, id: string): Promise<WhatsAppChannelSummary | null> {
    const row = await this.prisma.whatsAppChannel.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { _count: { select: { conversations: true } } },
    });
    return row ? this.toSummary(row, row._count.conversations) : null;
  }

  private toCredentials(row: WhatsAppChannel) {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      status: deriveStatus(row),
      businessAccountId: row.businessAccountId,
      phoneNumberId: row.phoneNumberId,
      accessToken: this.decrypt(row, 'access_token'),
      isActive: !row.deletedAt && !row.disconnectedAt,
      createdByAdminId: row.createdByAdminId,
    };
  }

  async getCredentials(organizationId: string, id: string) {
    const row = await this.prisma.whatsAppChannel.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    return row ? this.toCredentials(row) : null;
  }

  async getCredentialsForWorker(channelId: string) {
    const row = await this.prisma.whatsAppChannel.findUnique({ where: { id: channelId } });
    return row ? this.toCredentials(row) : null;
  }

  async findForWebhook(webhookKey: string) {
    const row = await this.prisma.whatsAppChannel.findUnique({ where: { webhookKey } });
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      businessAccountId: row.businessAccountId,
      phoneNumberId: row.phoneNumberId,
      verifyTokenHash: row.verifyTokenHash,
      appSecret: this.decrypt(row, 'app_secret'),
      isActive: !row.deletedAt && !row.disconnectedAt,
    };
  }

  async assertPhoneNumberAvailable(phoneNumberId: string, exceptChannelId?: string): Promise<void> {
    const existing = await this.prisma.whatsAppChannel.findFirst({
      where: {
        phoneNumberId,
        deletedAt: null,
        ...(exceptChannelId ? { id: { not: exceptChannelId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new WhatsAppConflictError(
        'This WhatsApp phone number is already connected to a channel.',
      );
    }
  }

  async create(input: {
    organizationId: string;
    adminId: string;
    name: string;
    connectionMethod: 'MANUAL' | 'EMBEDDED_SIGNUP';
    metaAppId: string | null;
    businessAccountId: string;
    phoneNumberId: string;
    accessToken: string;
    appSecret: string | null;
    verifyToken: string;
  }): Promise<{ id: string }> {
    const id = randomUUID();
    const accessTokenCiphertext = this.cipher.seal(input.accessToken, aad(id, 'access_token'));
    const appSecretCiphertext = input.appSecret
      ? this.cipher.seal(input.appSecret, aad(id, 'app_secret'))
      : null;
    await this.prisma.$transaction(async (tx) => {
      const taken = await tx.whatsAppChannel.findFirst({
        where: { phoneNumberId: input.phoneNumberId, deletedAt: null },
        select: { id: true },
      });
      if (taken) {
        throw new WhatsAppConflictError(
          'This WhatsApp phone number is already connected to a channel.',
        );
      }
      await tx.whatsAppChannel.create({
        data: {
          id,
          organizationId: input.organizationId,
          name: input.name,
          webhookKey: randomBytes(24).toString('base64url'),
          connectionMethod: input.connectionMethod,
          status: 'PENDING_SETUP',
          metaAppId: input.metaAppId,
          businessAccountId: input.businessAccountId,
          phoneNumberId: input.phoneNumberId,
          accessTokenCiphertext,
          accessTokenLast4: input.accessToken.slice(-4),
          appSecretCiphertext,
          verifyTokenHash: hashVerifyToken(input.verifyToken),
          credentialsUpdatedAt: new Date(),
          createdByAdminId: input.adminId,
        },
      });
      await recordAudit(tx, {
        organizationId: input.organizationId,
        adminId: input.adminId,
        type: 'WHATSAPP_CHANNEL_CREATED',
        entityType: 'whatsapp_channel',
        entityId: id,
        metadata: {
          name: input.name,
          connectionMethod: input.connectionMethod,
          businessAccountId: input.businessAccountId,
          phoneNumberId: input.phoneNumberId,
          hasAppSecret: input.appSecret !== null,
        },
      });
    });
    return { id };
  }

  async rename(organizationId: string, adminId: string, id: string, name: string): Promise<void> {
    const row = await this.findActiveRow(organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppChannel.update({ where: { id }, data: { name } });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CHANNEL_UPDATED',
        entityType: 'whatsapp_channel',
        entityId: id,
        metadata: { previousName: row.name, name },
      });
    });
  }

  async rotateCredentials(
    organizationId: string,
    adminId: string,
    id: string,
    credentials: { accessToken?: string; appSecret?: string; verifyToken?: string },
  ): Promise<void> {
    await this.findActiveRow(organizationId, id);
    const rotated: string[] = [];
    const data: Record<string, unknown> = { credentialsUpdatedAt: new Date() };
    if (credentials.accessToken) {
      data.accessTokenCiphertext = this.cipher.seal(
        credentials.accessToken,
        aad(id, 'access_token'),
      );
      data.accessTokenLast4 = credentials.accessToken.slice(-4);
      data.disconnectedAt = null;
      data.lastVerifiedAt = null;
      data.lastErrorCode = null;
      data.lastErrorMessage = null;
      rotated.push('accessToken');
    }
    if (credentials.appSecret) {
      data.appSecretCiphertext = this.cipher.seal(credentials.appSecret, aad(id, 'app_secret'));
      rotated.push('appSecret');
    }
    if (credentials.verifyToken) {
      data.verifyTokenHash = hashVerifyToken(credentials.verifyToken);
      data.webhookVerifiedAt = null;
      rotated.push('verifyToken');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppChannel.update({ where: { id }, data });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CHANNEL_CREDENTIALS_ROTATED',
        entityType: 'whatsapp_channel',
        entityId: id,
        metadata: { rotated },
      });
    });
    await this.syncStatus(id);
  }

  async recordVerification(
    organizationId: string,
    id: string,
    result:
      | { ok: true; info: ProviderPhoneNumberInfo }
      | { ok: false; code: string | null; message: string; credentialProblem: boolean },
  ): Promise<void> {
    await this.findActiveRow(organizationId, id);
    await this.prisma.whatsAppChannel.update({
      where: { id },
      data: result.ok
        ? {
            displayPhoneNumber: result.info.displayPhoneNumber,
            verifiedName: result.info.verifiedName,
            qualityRating: result.info.qualityRating,
            messagingLimitTier: result.info.messagingLimitTier,
            lastVerifiedAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          }
        : {
            lastErrorCode: result.code?.slice(0, 64) ?? null,
            lastErrorMessage: result.message.slice(0, 500),
          },
    });
    await this.syncStatus(id);
  }

  async markCredentialProblem(
    channelId: string,
    code: string | null,
    message: string,
  ): Promise<void> {
    await this.prisma.whatsAppChannel.update({
      where: { id: channelId },
      data: { lastErrorCode: code?.slice(0, 64) ?? null, lastErrorMessage: message.slice(0, 500) },
    });
    await this.syncStatus(channelId);
  }

  async markWebhookVerified(channelId: string): Promise<void> {
    await this.prisma.whatsAppChannel.update({
      where: { id: channelId },
      data: { webhookVerifiedAt: new Date() },
    });
    await this.syncStatus(channelId);
  }

  async markWebhookReceived(channelId: string): Promise<void> {
    await this.prisma.whatsAppChannel.update({
      where: { id: channelId },
      data: { lastWebhookAt: new Date() },
    });
  }

  async markTemplatesSynced(organizationId: string, id: string, at: Date): Promise<void> {
    await this.prisma.whatsAppChannel.updateMany({
      where: { id, organizationId },
      data: { templatesSyncedAt: at },
    });
  }

  async disconnect(organizationId: string, adminId: string, id: string): Promise<void> {
    await this.findActiveRow(organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppChannel.update({
        where: { id },
        data: {
          disconnectedAt: new Date(),
          status: 'DISCONNECTED',
          accessTokenCiphertext: null,
          accessTokenLast4: null,
        },
      });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CHANNEL_DISCONNECTED',
        entityType: 'whatsapp_channel',
        entityId: id,
        metadata: { accessTokenRevoked: true },
      });
    });
  }

  /** Keeps conversation history; wipes every credential and stops webhook processing. */
  async softDelete(organizationId: string, adminId: string, id: string): Promise<void> {
    const row = await this.findActiveRow(organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppChannel.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          disconnectedAt: row.disconnectedAt ?? new Date(),
          status: 'DISCONNECTED',
          accessTokenCiphertext: null,
          accessTokenLast4: null,
          appSecretCiphertext: null,
          verifyTokenHash: null,
        },
      });
      await tx.whatsAppBroadcast.updateMany({
        where: { channelId: id, status: { in: ['DRAFT', 'SCHEDULED', 'PROCESSING'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CHANNEL_DELETED',
        entityType: 'whatsapp_channel',
        entityId: id,
        metadata: { name: row.name, phoneNumberId: row.phoneNumberId },
      });
    });
  }
}
