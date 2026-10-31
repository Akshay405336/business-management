import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  WhatsAppBroadcastAudienceSource,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastStats,
  WhatsAppBroadcastSummary,
} from '@techwin/contracts';
import type { WhatsAppBroadcastAudience } from '@techwin/validation';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { WhatsAppPolicyError, WhatsAppValidationError } from '../../domain/whatsapp.errors.js';
import {
  isUniqueViolation,
  recordAudit,
  recordConversationEvent,
  toJson,
} from './whatsapp-persistence.shared.js';

const MAX_RECIPIENTS = 10_000;
const LOCK_SECONDS = 120;

function audienceWhere(
  organizationId: string,
  audience: WhatsAppBroadcastAudience,
): Prisma.WhatsAppContactWhereInput {
  switch (audience.source) {
    case 'CLIENTS':
      return { organizationId, clientId: { not: null } };
    case 'LEADS':
      return { organizationId, leadId: { not: null } };
    case 'SELECTED':
      return { organizationId, id: { in: audience.contactIds ?? [] } };
    default:
      return { organizationId };
  }
}

const emptyStats = (): WhatsAppBroadcastStats => ({
  total: 0,
  pending: 0,
  sent: 0,
  delivered: 0,
  read: 0,
  failed: 0,
  skipped: 0,
});

const broadcastInclude = {
  channel: { select: { name: true } },
  template: { select: { name: true, language: true } },
} as const satisfies Prisma.WhatsAppBroadcastInclude;

type BroadcastRow = Prisma.WhatsAppBroadcastGetPayload<{ include: typeof broadcastInclude }>;

function audienceSourceOf(value: unknown): WhatsAppBroadcastAudienceSource {
  const source = (value as { source?: unknown } | null)?.source;
  return source === 'CLIENTS' || source === 'LEADS' || source === 'SELECTED'
    ? source
    : 'ALL_OPTED_IN';
}

function toSummary(row: BroadcastRow, stats: WhatsAppBroadcastStats): WhatsAppBroadcastSummary {
  return {
    id: row.id,
    name: row.name,
    channelId: row.channelId,
    channelName: row.channel.name,
    templateId: row.templateId,
    templateName: row.template.name,
    templateLanguage: row.template.language,
    status: row.status,
    audienceSource: audienceSourceOf(row.audience),
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    stats,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PrismaWhatsAppBroadcastStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async statsFor(broadcastIds: string[]): Promise<Map<string, WhatsAppBroadcastStats>> {
    const map = new Map<string, WhatsAppBroadcastStats>();
    if (broadcastIds.length === 0) return map;
    const groups = await this.prisma.whatsAppBroadcastRecipient.groupBy({
      by: ['broadcastId', 'status'],
      where: { broadcastId: { in: broadcastIds } },
      _count: { _all: true },
    });
    for (const group of groups) {
      const stats = map.get(group.broadcastId) ?? emptyStats();
      const count = group._count._all;
      const key = group.status.toLowerCase() as keyof Omit<WhatsAppBroadcastStats, 'total'>;
      map.set(group.broadcastId, {
        ...stats,
        total: stats.total + count,
        [key]: stats[key] + count,
      });
    }
    return map;
  }

  async previewAudience(
    organizationId: string,
    channelId: string,
    audience: WhatsAppBroadcastAudience,
  ) {
    const channel = await this.prisma.whatsAppChannel.findFirst({
      where: { id: channelId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!channel) throw new WhatsAppValidationError('Choose a WhatsApp channel.');
    const base = audienceWhere(organizationId, audience);
    const [eligible, excludedNoConsent, excludedOptedOut, sample] = await Promise.all([
      this.prisma.whatsAppContact.count({ where: { ...base, consentStatus: 'OPTED_IN' } }),
      this.prisma.whatsAppContact.count({ where: { ...base, consentStatus: 'UNKNOWN' } }),
      this.prisma.whatsAppContact.count({ where: { ...base, consentStatus: 'OPTED_OUT' } }),
      this.prisma.whatsAppContact.findMany({
        where: { ...base, consentStatus: 'OPTED_IN' },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { lead: { select: { fullName: true } }, client: { select: { name: true } } },
      }),
    ]);
    return {
      eligible,
      excludedNoConsent,
      excludedOptedOut,
      sample: sample.map((contact) => ({
        contactId: contact.id,
        name:
          contact.client?.name ||
          contact.lead?.fullName ||
          contact.profileName ||
          contact.phoneE164,
        phoneE164: contact.phoneE164,
      })),
    };
  }

  async create(input: {
    organizationId: string;
    adminId: string;
    name: string;
    channelId: string;
    templateId: string;
    templateVariables: readonly string[];
    audience: WhatsAppBroadcastAudience;
    scheduledAt: Date | null;
    idempotencyKey: string;
  }): Promise<{ id: string; duplicate: boolean }> {
    const findExisting = () =>
      this.prisma.whatsAppBroadcast.findUnique({
        where: {
          organizationId_idempotencyKey: {
            organizationId: input.organizationId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        select: { id: true },
      });
    const existing = await findExisting();
    if (existing) return { id: existing.id, duplicate: true };

    const recipients = await this.prisma.whatsAppContact.findMany({
      where: { ...audienceWhere(input.organizationId, input.audience), consentStatus: 'OPTED_IN' },
      select: { id: true },
      take: MAX_RECIPIENTS + 1,
    });
    if (recipients.length === 0) {
      throw new WhatsAppPolicyError(
        'No recipients with recorded WhatsApp opt-in match this audience.',
      );
    }
    if (recipients.length > MAX_RECIPIENTS) {
      throw new WhatsAppValidationError(
        `A broadcast can target at most ${MAX_RECIPIENTS} contacts.`,
      );
    }

    const id = randomUUID();
    const now = new Date();
    const scheduled =
      input.scheduledAt !== null && input.scheduledAt.getTime() > now.getTime() + 30_000;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.whatsAppBroadcast.create({
          data: {
            id,
            organizationId: input.organizationId,
            channelId: input.channelId,
            templateId: input.templateId,
            name: input.name,
            templateVariables: toJson([...input.templateVariables]) as Prisma.InputJsonValue,
            audience: toJson(input.audience) as Prisma.InputJsonValue,
            status: scheduled ? 'SCHEDULED' : 'PROCESSING',
            scheduledAt: scheduled ? input.scheduledAt : null,
            startedAt: scheduled ? null : now,
            totalRecipients: recipients.length,
            createdByAdminId: input.adminId,
            confirmedByAdminId: input.adminId,
            confirmedAt: now,
            idempotencyKey: input.idempotencyKey,
          },
        });
        for (let offset = 0; offset < recipients.length; offset += 1000) {
          await tx.whatsAppBroadcastRecipient.createMany({
            data: recipients.slice(offset, offset + 1000).map((recipient) => ({
              id: randomUUID(),
              organizationId: input.organizationId,
              broadcastId: id,
              contactId: recipient.id,
            })),
          });
        }
        await recordAudit(tx, {
          organizationId: input.organizationId,
          adminId: input.adminId,
          type: 'WHATSAPP_BROADCAST_CONFIRMED',
          entityType: 'whatsapp_broadcast',
          entityId: id,
          metadata: {
            name: input.name,
            templateId: input.templateId,
            recipients: recipients.length,
            audience: input.audience.source,
            scheduledAt: scheduled ? input.scheduledAt?.toISOString() : null,
          },
        });
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await findExisting();
      if (raced) return { id: raced.id, duplicate: true };
      throw error;
    }
    return { id, duplicate: false };
  }

  async list(organizationId: string): Promise<readonly WhatsAppBroadcastSummary[]> {
    const rows = await this.prisma.whatsAppBroadcast.findMany({
      where: { organizationId },
      include: broadcastInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const stats = await this.statsFor(rows.map((row) => row.id));
    return rows.map((row) => toSummary(row, stats.get(row.id) ?? emptyStats()));
  }

  async get(organizationId: string, id: string): Promise<WhatsAppBroadcastDetail | null> {
    const row = await this.prisma.whatsAppBroadcast.findFirst({
      where: { id, organizationId },
      include: broadcastInclude,
    });
    if (!row) return null;
    const [stats, failures] = await Promise.all([
      this.statsFor([row.id]),
      this.prisma.whatsAppBroadcastRecipient.findMany({
        where: { broadcastId: id, status: { in: ['FAILED', 'SKIPPED'] } },
        include: {
          contact: {
            select: {
              id: true,
              phoneE164: true,
              profileName: true,
              lead: { select: { fullName: true } },
              client: { select: { name: true } },
            },
          },
        },
        take: 100,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      ...toSummary(row, stats.get(row.id) ?? emptyStats()),
      templateVariables: Array.isArray(row.templateVariables)
        ? row.templateVariables.filter((value): value is string => typeof value === 'string')
        : [],
      failures: failures.map((failure) => ({
        contactId: failure.contact.id,
        name:
          failure.contact.client?.name ||
          failure.contact.lead?.fullName ||
          failure.contact.profileName ||
          failure.contact.phoneE164,
        phoneE164: failure.contact.phoneE164,
        errorMessage: failure.errorMessage ?? (failure.status === 'SKIPPED' ? 'Skipped' : 'Failed'),
      })),
    };
  }

  async cancel(organizationId: string, adminId: string, id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.whatsAppBroadcast.updateMany({
        where: { id, organizationId, status: { in: ['DRAFT', 'SCHEDULED', 'PROCESSING'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      if (result.count === 0) return false;
      await tx.whatsAppBroadcastRecipient.updateMany({
        where: { broadcastId: id, status: 'PENDING', messageId: null },
        data: { status: 'SKIPPED', errorMessage: 'Broadcast cancelled before sending.' },
      });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_BROADCAST_CANCELLED',
        entityType: 'whatsapp_broadcast',
        entityId: id,
      });
      return true;
    });
  }

  async startDue(now: Date): Promise<number> {
    const result = await this.prisma.whatsAppBroadcast.updateMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      data: { status: 'PROCESSING', startedAt: now },
    });
    return result.count;
  }

  async claimRecipients(limit: number) {
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE whatsapp_broadcast_recipients
      SET locked_until = now() + make_interval(secs => ${LOCK_SECONDS}::int),
          attempt_count = attempt_count + 1,
          updated_at = now()
      WHERE id IN (
        SELECT r.id FROM whatsapp_broadcast_recipients r
        JOIN whatsapp_broadcasts b ON b.id = r.broadcast_id
        WHERE r.status = 'PENDING' AND r.message_id IS NULL AND r.next_attempt_at <= now()
          AND (r.locked_until IS NULL OR r.locked_until < now())
          AND b.status = 'PROCESSING'
        ORDER BY r.created_at
        LIMIT ${limit}::int
        FOR UPDATE OF r SKIP LOCKED
      )
      RETURNING id`;
    if (claimed.length === 0) return [];
    const rows = await this.prisma.whatsAppBroadcastRecipient.findMany({
      where: { id: { in: claimed.map((row) => row.id) } },
      include: {
        broadcast: true,
        contact: {
          select: {
            id: true,
            phoneE164: true,
            profileName: true,
            consentStatus: true,
            lead: { select: { fullName: true } },
            client: { select: { name: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      recipientId: row.id,
      organizationId: row.organizationId,
      broadcastId: row.broadcastId,
      channelId: row.broadcast.channelId,
      templateId: row.broadcast.templateId,
      templateVariables: Array.isArray(row.broadcast.templateVariables)
        ? row.broadcast.templateVariables.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      createdByAdminId: row.broadcast.createdByAdminId,
      contactId: row.contactId,
      contactName:
        row.contact.client?.name || row.contact.lead?.fullName || row.contact.profileName,
      phoneE164: row.contact.phoneE164,
      consentStatus: row.contact.consentStatus,
      attemptCount: row.attemptCount,
    }));
  }

  async ensureConversation(
    organizationId: string,
    channelId: string,
    contactId: string,
  ): Promise<string> {
    const existing = await this.prisma.whatsAppConversation.findUnique({
      where: { channelId_contactId: { channelId, contactId } },
      select: { id: true },
    });
    if (existing) return existing.id;
    const id = randomUUID();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.whatsAppConversation.create({
          data: {
            id,
            organizationId,
            channelId,
            contactId,
            status: 'RESOLVED',
            resolvedAt: new Date(),
          },
        });
        await recordConversationEvent(tx, {
          organizationId,
          channelId,
          conversationId: id,
          type: 'CONVERSATION_CREATED',
          metadata: { source: 'broadcast' },
        });
      });
      return id;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.prisma.whatsAppConversation.findUnique({
        where: { channelId_contactId: { channelId, contactId } },
        select: { id: true },
      });
      if (!raced) throw error;
      return raced.id;
    }
  }

  async markRecipientQueued(recipientId: string, messageId: string): Promise<void> {
    await this.prisma.whatsAppBroadcastRecipient.update({
      where: { id: recipientId },
      data: { messageId, lockedUntil: null, errorMessage: null },
    });
  }

  async markRecipientSkipped(recipientId: string, reason: string): Promise<void> {
    await this.prisma.whatsAppBroadcastRecipient.update({
      where: { id: recipientId },
      data: { status: 'SKIPPED', lockedUntil: null, errorMessage: reason.slice(0, 500) },
    });
  }

  async markRecipientRetry(
    recipientId: string,
    reason: string,
    nextAttemptAt: Date,
  ): Promise<void> {
    await this.prisma.whatsAppBroadcastRecipient.update({
      where: { id: recipientId },
      data: { lockedUntil: null, nextAttemptAt, errorMessage: reason.slice(0, 500) },
    });
  }

  async markRecipientFailed(recipientId: string, reason: string): Promise<void> {
    await this.prisma.whatsAppBroadcastRecipient.update({
      where: { id: recipientId },
      data: { status: 'FAILED', lockedUntil: null, errorMessage: reason.slice(0, 500) },
    });
  }

  async completeFinished(): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE whatsapp_broadcasts b
      SET status = 'COMPLETED', completed_at = now(), updated_at = now()
      WHERE b.status = 'PROCESSING'
        AND NOT EXISTS (
          SELECT 1 FROM whatsapp_broadcast_recipients r
          WHERE r.broadcast_id = b.id AND r.status = 'PENDING'
        )`;
  }
}
