import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { isUniqueViolation, toJson } from './whatsapp-persistence.shared.js';

const LOCK_SECONDS = 120;

@Injectable()
export class PrismaWhatsAppWebhookEventStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async persist(
    channel: { id: string; organizationId: string },
    payloadSha256: string,
    payload: unknown,
  ): Promise<{ eventId: string; duplicate: boolean }> {
    const id = randomUUID();
    try {
      await this.prisma.whatsAppWebhookEvent.create({
        data: {
          id,
          organizationId: channel.organizationId,
          channelId: channel.id,
          payloadSha256,
          payload: toJson(payload),
        },
      });
      return { eventId: id, duplicate: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.whatsAppWebhookEvent.findUnique({
        where: { channelId_payloadSha256: { channelId: channel.id, payloadSha256 } },
        select: { id: true },
      });
      return { eventId: existing?.id ?? id, duplicate: true };
    }
  }

  /** Claims due events across all API instances without double processing. */
  async claim(limit: number, eventId?: string) {
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        organization_id: string;
        channel_id: string;
        payload: unknown;
        attempt_count: number;
      }[]
    >`
      UPDATE whatsapp_webhook_events
      SET status = 'PROCESSING',
          locked_until = now() + make_interval(secs => ${LOCK_SECONDS}::int),
          attempt_count = attempt_count + 1
      WHERE id IN (
        SELECT id FROM whatsapp_webhook_events
        WHERE ((status = 'PENDING' AND next_attempt_at <= now())
           OR (status = 'PROCESSING' AND locked_until < now()))
          ${eventId ? Prisma.sql`AND id = ${eventId}::uuid` : Prisma.empty}
        ORDER BY received_at
        LIMIT ${limit}::int
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, organization_id, channel_id, payload, attempt_count`;
    return rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id,
      payload: row.payload,
      attemptCount: row.attempt_count,
    }));
  }

  /** The raw payload contains customer content; it is dropped once normalized data is stored. */
  async markProcessed(id: string): Promise<void> {
    await this.prisma.whatsAppWebhookEvent.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        lockedUntil: null,
        lastError: null,
        payload: Prisma.DbNull,
      },
    });
  }

  async markRetry(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    await this.prisma.whatsAppWebhookEvent.update({
      where: { id },
      data: { status: 'PENDING', lockedUntil: null, nextAttemptAt, lastError: error.slice(0, 500) },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.whatsAppWebhookEvent.update({
      where: { id },
      data: { status: 'FAILED', lockedUntil: null, lastError: error.slice(0, 500) },
    });
  }
}
