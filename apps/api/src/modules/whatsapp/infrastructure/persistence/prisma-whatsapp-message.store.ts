import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { WhatsAppMessageType } from '@techwin/contracts';
import type {
  WhatsAppBroadcastRecipientStatus,
  WhatsAppConversationStatus,
} from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { WhatsAppNotFoundError } from '../../domain/whatsapp.errors.js';
import { toE164 } from '../../domain/whatsapp-phone.js';
import {
  canApplyOutboundStatus,
  isOptOutKeyword,
  messagePreview,
} from '../../domain/whatsapp-policy.js';
import type {
  InboundMessage,
  StatusReceipt,
  TemplateStatusChange,
} from '../../domain/whatsapp-webhook-payload.js';
import {
  findCrmPhoneMatches,
  isUniqueViolation,
  recordConversationEvent,
  toJson,
  type Tx,
} from './whatsapp-persistence.shared.js';

const RECIPIENT_STATUS_FOR: Readonly<Record<string, WhatsAppBroadcastRecipientStatus>> = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
};
const RECIPIENT_RANK: Readonly<Record<WhatsAppBroadcastRecipientStatus, number>> = {
  PENDING: 0,
  SKIPPED: 0,
  SENT: 1,
  FAILED: 1,
  DELIVERED: 2,
  READ: 3,
};

@Injectable()
export class PrismaWhatsAppMessageStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async upsertContact(tx: Tx, organizationId: string, waId: string, profileName: string) {
    const existing = await tx.whatsAppContact.findUnique({
      where: { organizationId_waId: { organizationId, waId } },
    });
    if (existing) {
      if (profileName && profileName !== existing.profileName) {
        return tx.whatsAppContact.update({ where: { id: existing.id }, data: { profileName } });
      }
      return existing;
    }
    const matches = await findCrmPhoneMatches(tx, organizationId, waId);
    return tx.whatsAppContact.create({
      data: {
        id: randomUUID(),
        organizationId,
        waId,
        phoneE164: toE164(waId),
        profileName,
        leadId: matches.leads.length === 1 ? (matches.leads[0]?.id ?? null) : null,
        clientId: matches.clients.length === 1 ? (matches.clients[0]?.id ?? null) : null,
      },
    });
  }

  async ingestInbound(channel: { id: string; organizationId: string }, message: InboundMessage) {
    const organizationId = channel.organizationId;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.whatsAppMessage.findUnique({
          where: {
            channelId_providerMessageId: {
              channelId: channel.id,
              providerMessageId: message.providerMessageId,
            },
          },
          select: { id: true },
        });
        if (duplicate) return null;

        const contact = await this.upsertContact(
          tx,
          organizationId,
          message.fromWaId,
          message.profileName,
        );
        let conversation = await tx.whatsAppConversation.findUnique({
          where: { channelId_contactId: { channelId: channel.id, contactId: contact.id } },
        });
        let created = false;
        if (!conversation) {
          conversation = await tx.whatsAppConversation.create({
            data: {
              id: randomUUID(),
              organizationId,
              channelId: channel.id,
              contactId: contact.id,
              status: 'NEW',
              lastMessageAt: message.timestamp,
            },
          });
          created = true;
        }

        const messageId = randomUUID();
        await tx.whatsAppMessage.create({
          data: {
            id: messageId,
            organizationId,
            channelId: channel.id,
            conversationId: conversation.id,
            contactId: contact.id,
            direction: 'INBOUND',
            type: message.type,
            status: 'RECEIVED',
            providerMessageId: message.providerMessageId,
            body: message.body,
            payload: toJson(message.payload),
            mediaStatus: message.media ? 'PENDING' : 'NONE',
            mediaProviderId: message.media?.providerMediaId ?? null,
            mediaMimeType: message.media?.mimeType ?? null,
            mediaFileName: message.media?.fileName ?? null,
            providerTimestamp: message.timestamp,
          },
        });

        const previousStatus = conversation.status;
        let nextStatus: WhatsAppConversationStatus = previousStatus;
        if (previousStatus === 'RESOLVED')
          nextStatus = conversation.assignedEmployeeId ? 'OPEN' : 'NEW';
        const isLatest = message.timestamp.getTime() >= conversation.lastMessageAt.getTime();
        const lastInboundAt =
          !conversation.lastInboundAt || message.timestamp > conversation.lastInboundAt
            ? message.timestamp
            : conversation.lastInboundAt;

        await tx.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            status: nextStatus,
            unreadCount: { increment: 1 },
            lastInboundAt,
            ...(nextStatus !== previousStatus ? { resolvedAt: null, resolvedByAdminId: null } : {}),
            ...(isLatest || created
              ? {
                  lastMessageAt: message.timestamp,
                  lastMessagePreview: messagePreview(message.type, message.body),
                  lastMessageDirection: 'INBOUND' as const,
                }
              : {}),
          },
        });
        await tx.whatsAppContact.update({
          where: { id: contact.id },
          data: { lastInboundAt },
        });

        const eventBase = {
          organizationId,
          channelId: channel.id,
          conversationId: conversation.id,
        };
        if (created)
          await recordConversationEvent(tx, { ...eventBase, type: 'CONVERSATION_CREATED' });
        await recordConversationEvent(tx, { ...eventBase, type: 'MESSAGE_RECEIVED', messageId });
        if (nextStatus !== previousStatus) {
          await recordConversationEvent(tx, {
            ...eventBase,
            type: 'STATUS_CHANGED',
            metadata: { from: previousStatus, to: nextStatus, reason: 'customer_message' },
          });
        }
        if (
          message.type === 'TEXT' &&
          isOptOutKeyword(message.body) &&
          contact.consentStatus !== 'OPTED_OUT'
        ) {
          await tx.whatsAppContact.update({
            where: { id: contact.id },
            data: {
              consentStatus: 'OPTED_OUT',
              consentSource: 'Customer sent an opt-out keyword on WhatsApp',
              consentUpdatedAt: new Date(),
              consentUpdatedByAdminId: null,
            },
          });
          await recordConversationEvent(tx, {
            ...eventBase,
            type: 'CONTACT_UPDATED',
            metadata: {
              consent: { from: contact.consentStatus, to: 'OPTED_OUT' },
              reason: 'opt_out_keyword',
            },
          });
        }

        return {
          organizationId,
          conversationId: conversation.id,
          messageId,
          media: message.media
            ? {
                providerMediaId: message.media.providerMediaId,
                mimeType: message.media.mimeType,
                fileName: message.media.fileName,
              }
            : null,
        };
      });
    } catch (error) {
      // A concurrent delivery of the same message or first contact won the race; retry once.
      if (!isUniqueViolation(error)) throw error;
      const exists = await this.prisma.whatsAppMessage.findUnique({
        where: {
          channelId_providerMessageId: {
            channelId: channel.id,
            providerMessageId: message.providerMessageId,
          },
        },
        select: { id: true },
      });
      if (exists) return null;
      throw error;
    }
  }

  async attachInboundMedia(
    messageId: string,
    result:
      | { ok: true; storedObjectId: string; mimeType: string; sizeBytes: number; fileName: string }
      | { ok: false; reason: string },
  ) {
    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { organizationId: true, channelId: true, conversationId: true },
    });
    if (!message) return null;
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.update({
        where: { id: messageId },
        data: result.ok
          ? {
              mediaStatus: 'READY',
              mediaStoredObjectId: result.storedObjectId,
              mediaMimeType: result.mimeType,
              mediaSizeBytes: result.sizeBytes,
              mediaFileName: result.fileName,
            }
          : { mediaStatus: 'FAILED', errorMessage: result.reason.slice(0, 500) },
      });
      await recordConversationEvent(tx, {
        organizationId: message.organizationId,
        channelId: message.channelId,
        conversationId: message.conversationId,
        type: 'MESSAGE_UPDATED',
        messageId,
      });
    });
    return { organizationId: message.organizationId, conversationId: message.conversationId };
  }

  async applyReceipt(channelId: string, receipt: StatusReceipt) {
    const empty = {
      known: false,
      applied: false,
      organizationId: null,
      conversationId: null,
      messageId: null,
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const message = await this.prisma.whatsAppMessage.findUnique({
        where: {
          channelId_providerMessageId: { channelId, providerMessageId: receipt.providerMessageId },
        },
        select: {
          id: true,
          organizationId: true,
          conversationId: true,
          status: true,
          direction: true,
          broadcastId: true,
          sentAt: true,
          deliveredAt: true,
        },
      });
      if (!message) return empty;
      const known = {
        known: true,
        organizationId: message.organizationId,
        conversationId: message.conversationId,
        messageId: message.id,
      };
      if (
        message.direction !== 'OUTBOUND' ||
        !canApplyOutboundStatus(message.status, receipt.status)
      ) {
        return { ...known, applied: false };
      }
      const at = receipt.timestamp;
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.whatsAppMessage.updateMany({
          where: { id: message.id, status: message.status },
          data: {
            status: receipt.status,
            ...(receipt.status !== 'FAILED' && !message.sentAt ? { sentAt: at } : {}),
            ...((receipt.status === 'DELIVERED' || receipt.status === 'READ') &&
            !message.deliveredAt
              ? { deliveredAt: at }
              : {}),
            ...(receipt.status === 'READ' ? { readAt: at } : {}),
            ...(receipt.status === 'FAILED'
              ? {
                  failedAt: at,
                  errorCode: receipt.errorCode?.slice(0, 64) ?? null,
                  errorMessage:
                    receipt.errorMessage?.slice(0, 500) ?? 'WhatsApp reported a delivery failure.',
                }
              : { errorCode: null, errorMessage: null }),
          },
        });
        if (result.count === 0) return false;
        if (message.broadcastId) await this.advanceRecipient(tx, message.id, receipt);
        await recordConversationEvent(tx, {
          organizationId: message.organizationId,
          channelId,
          conversationId: message.conversationId,
          type: 'MESSAGE_UPDATED',
          messageId: message.id,
        });
        return true;
      });
      if (updated) return { ...known, applied: true };
    }
    return empty;
  }

  private async advanceRecipient(tx: Tx, messageId: string, receipt: StatusReceipt): Promise<void> {
    const recipient = await tx.whatsAppBroadcastRecipient.findUnique({ where: { messageId } });
    const next = RECIPIENT_STATUS_FOR[receipt.status];
    if (!recipient || !next) return;
    if (next === 'FAILED' && RECIPIENT_RANK[recipient.status] >= RECIPIENT_RANK.DELIVERED) return;
    if (
      next !== 'FAILED' &&
      RECIPIENT_RANK[next] <= RECIPIENT_RANK[recipient.status] &&
      recipient.status !== 'FAILED'
    ) {
      return;
    }
    await tx.whatsAppBroadcastRecipient.update({
      where: { id: recipient.id },
      data: {
        status: next,
        errorMessage:
          next === 'FAILED' ? (receipt.errorMessage?.slice(0, 500) ?? 'Delivery failed.') : null,
      },
    });
  }

  async applyTemplateStatus(channelId: string, change: TemplateStatusChange): Promise<void> {
    await this.prisma.whatsAppTemplate.updateMany({
      where: { channelId, providerTemplateId: change.providerTemplateId },
      data: {
        status: change.status.slice(0, 32),
        rejectedReason:
          change.reason && change.reason !== 'NONE' ? change.reason.slice(0, 255) : null,
      },
    });
  }

  async createOutbound(input: {
    organizationId: string;
    conversationId: string;
    adminId: string | null;
    type: WhatsAppMessageType;
    body: string;
    payload: Record<string, unknown> | null;
    idempotencyKey: string | null;
    templateId: string | null;
    broadcastId: string | null;
    media: {
      storedObjectId: string;
      providerMediaId: string;
      mimeType: string;
      fileName: string;
      sizeBytes: number;
    } | null;
  }): Promise<{ messageId: string; duplicate: boolean }> {
    const findExisting = async () =>
      input.idempotencyKey
        ? this.prisma.whatsAppMessage.findUnique({
            where: {
              organizationId_idempotencyKey: {
                organizationId: input.organizationId,
                idempotencyKey: input.idempotencyKey,
              },
            },
            select: { id: true, conversationId: true },
          })
        : null;

    const existing = await findExisting();
    if (existing) return { messageId: existing.id, duplicate: true };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const conversation = await tx.whatsAppConversation.findFirst({
          where: { id: input.conversationId, organizationId: input.organizationId },
        });
        if (!conversation) throw new WhatsAppNotFoundError('Conversation');
        const now = new Date();
        const messageId = randomUUID();
        await tx.whatsAppMessage.create({
          data: {
            id: messageId,
            organizationId: input.organizationId,
            channelId: conversation.channelId,
            conversationId: conversation.id,
            contactId: conversation.contactId,
            direction: 'OUTBOUND',
            type: input.type,
            status: 'QUEUED',
            idempotencyKey: input.idempotencyKey,
            body: input.body,
            payload: toJson(input.payload),
            templateId: input.templateId,
            broadcastId: input.broadcastId,
            sentByAdminId: input.adminId,
            nextAttemptAt: now,
            ...(input.media
              ? {
                  mediaStatus: 'READY' as const,
                  mediaStoredObjectId: input.media.storedObjectId,
                  mediaProviderId: input.media.providerMediaId,
                  mediaMimeType: input.media.mimeType,
                  mediaFileName: input.media.fileName,
                  mediaSizeBytes: input.media.sizeBytes,
                }
              : {}),
          },
        });
        const agentReply = input.adminId !== null && input.broadcastId === null;
        const nextStatus =
          agentReply && conversation.status === 'NEW' ? 'OPEN' : conversation.status;
        await tx.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            status: nextStatus,
            lastMessageAt: now,
            lastMessagePreview: messagePreview(input.type, input.body),
            lastMessageDirection: 'OUTBOUND',
            ...(agentReply && !conversation.firstResponseAt && conversation.lastInboundAt
              ? { firstResponseAt: now }
              : {}),
          },
        });
        const eventBase = {
          organizationId: input.organizationId,
          channelId: conversation.channelId,
          conversationId: conversation.id,
        };
        await recordConversationEvent(tx, {
          ...eventBase,
          type: 'MESSAGE_SENT',
          messageId,
          actorAdminId: input.adminId,
        });
        if (nextStatus !== conversation.status) {
          await recordConversationEvent(tx, {
            ...eventBase,
            type: 'STATUS_CHANGED',
            actorAdminId: input.adminId,
            metadata: { from: conversation.status, to: nextStatus, reason: 'agent_reply' },
          });
        }
        return { messageId, duplicate: false };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await findExisting();
      if (raced) return { messageId: raced.id, duplicate: true };
      throw error;
    }
  }

  async getDeliveryJob(messageId: string) {
    const row = await this.prisma.whatsAppMessage.findUnique({
      where: { id: messageId },
      include: { contact: { select: { waId: true } } },
    });
    if (!row || row.direction !== 'OUTBOUND') return null;
    return {
      messageId: row.id,
      organizationId: row.organizationId,
      channelId: row.channelId,
      conversationId: row.conversationId,
      toWaId: row.contact.waId,
      type: row.type,
      body: row.body,
      payload:
        row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : null,
      status: row.status,
      attemptCount: row.attemptCount,
      mediaProviderId: row.mediaProviderId,
      mediaMimeType: row.mediaMimeType,
      mediaFileName: row.mediaFileName,
      mediaStoredObjectId: row.mediaStoredObjectId,
    };
  }

  async claimForSending(messageId: string): Promise<boolean> {
    const result = await this.prisma.whatsAppMessage.updateMany({
      where: { id: messageId, status: 'QUEUED', providerMessageId: null },
      data: { status: 'SENDING', attemptCount: { increment: 1 }, nextAttemptAt: null },
    });
    return result.count === 1;
  }

  private async emitUpdate(tx: Tx, messageId: string): Promise<void> {
    const message = await tx.whatsAppMessage.findUnique({
      where: { id: messageId },
      select: { organizationId: true, channelId: true, conversationId: true },
    });
    if (!message) return;
    await recordConversationEvent(tx, { ...message, type: 'MESSAGE_UPDATED', messageId });
  }

  /** Meta accepted the request. Delivery and read are only recorded from receipts. */
  async markSent(messageId: string, providerMessageId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.updateMany({
        where: { id: messageId, status: 'SENDING' },
        data: {
          status: 'SENT',
          providerMessageId,
          sentAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
      await tx.whatsAppBroadcastRecipient.updateMany({
        where: { messageId, status: 'PENDING' },
        data: { status: 'SENT' },
      });
      await this.emitUpdate(tx, messageId);
    });
  }

  async markRetry(messageId: string, error: string, nextAttemptAt: Date): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.updateMany({
        where: { id: messageId, status: 'SENDING' },
        data: { status: 'QUEUED', nextAttemptAt, errorMessage: error.slice(0, 500) },
      });
      await this.emitUpdate(tx, messageId);
    });
  }

  async markFailed(messageId: string, code: string | null, message: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppMessage.updateMany({
        where: { id: messageId, status: { in: ['QUEUED', 'SENDING'] } },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          nextAttemptAt: null,
          errorCode: code?.slice(0, 64) ?? null,
          errorMessage: message.slice(0, 500),
        },
      });
      await tx.whatsAppBroadcastRecipient.updateMany({
        where: { messageId, status: 'PENDING' },
        data: { status: 'FAILED', errorMessage: message.slice(0, 500) },
      });
      await this.emitUpdate(tx, messageId);
    });
  }

  async requeueFailed(organizationId: string, messageId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.whatsAppMessage.updateMany({
        where: {
          id: messageId,
          organizationId,
          direction: 'OUTBOUND',
          status: 'FAILED',
          providerMessageId: null,
        },
        data: {
          status: 'QUEUED',
          attemptCount: 0,
          nextAttemptAt: new Date(),
          failedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      if (result.count === 1) await this.emitUpdate(tx, messageId);
      return result.count === 1;
    });
  }

  async claimDueRetries(limit: number): Promise<readonly string[]> {
    const rows = await this.prisma.whatsAppMessage.findMany({
      where: {
        direction: 'OUTBOUND',
        status: 'QUEUED',
        nextAttemptAt: { lte: new Date() },
        createdAt: { lte: new Date(Date.now() - 3_000) },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /**
   * A send interrupted mid-request may or may not have reached Meta. Resending
   * could duplicate the message, so it is failed for a person to review.
   */
  async failStuckSending(olderThan: Date): Promise<number> {
    const stuck = await this.prisma.whatsAppMessage.findMany({
      where: { status: 'SENDING', providerMessageId: null, updatedAt: { lt: olderThan } },
      select: { id: true },
      take: 100,
    });
    for (const row of stuck) {
      await this.markFailed(
        row.id,
        'interrupted',
        'Sending was interrupted and the delivery state is unknown. Check with the customer before retrying.',
      );
    }
    return stuck.length;
  }

  async getMediaRef(organizationId: string, messageId: string) {
    const row = await this.prisma.whatsAppMessage.findFirst({
      where: { id: messageId, organizationId },
      select: {
        conversationId: true,
        mediaStoredObjectId: true,
        mediaMimeType: true,
        mediaFileName: true,
      },
    });
    return row
      ? {
          conversationId: row.conversationId,
          storedObjectId: row.mediaStoredObjectId,
          mimeType: row.mediaMimeType,
          fileName: row.mediaFileName,
        }
      : null;
  }
}
