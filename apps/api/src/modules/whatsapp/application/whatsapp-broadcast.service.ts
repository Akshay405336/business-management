import { Inject, Injectable } from '@nestjs/common';
import type {
  WhatsAppBroadcastAudiencePreview,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastListResponse,
} from '@techwin/contracts';
import type {
  WhatsAppBroadcastAudiencePreviewRequest,
  WhatsAppCreateBroadcastRequest,
} from '@techwin/validation';
import {
  RATE_LIMITER,
  type RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';
import {
  WhatsAppError,
  WhatsAppNotFoundError,
  WhatsAppPolicyError,
  WhatsAppValidationError,
} from '../domain/whatsapp.errors.js';
import {
  MAX_SEND_ATTEMPTS,
  resolveBroadcastVariable,
  retryDelayMs,
} from '../domain/whatsapp-policy.js';
import { enforceRateLimit, WHATSAPP_RATE_LIMITS, type WhatsAppActor } from './whatsapp-access.js';
import { WhatsAppOutboundService } from './whatsapp-outbound.service.js';
import { WhatsAppRealtimeService } from './whatsapp-realtime.service.js';
import {
  WHATSAPP_BROADCAST_STORE,
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_MESSAGE_STORE,
  type BroadcastRecipientJob,
  type WhatsAppBroadcastStore,
  type WhatsAppChannelStore,
  type WhatsAppMessageStore,
} from './whatsapp.stores.js';

type BroadcastActor = Pick<WhatsAppActor, 'organizationId' | 'adminId'>;

const MAX_SCHEDULE_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class WhatsAppBroadcastService {
  constructor(
    @Inject(WHATSAPP_BROADCAST_STORE) private readonly broadcasts: WhatsAppBroadcastStore,
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_MESSAGE_STORE) private readonly messages: WhatsAppMessageStore,
    @Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService,
    @Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async list(organizationId: string): Promise<WhatsAppBroadcastListResponse> {
    return { broadcasts: await this.broadcasts.list(organizationId) };
  }

  async get(organizationId: string, id: string): Promise<WhatsAppBroadcastDetail> {
    const broadcast = await this.broadcasts.get(organizationId, id);
    if (!broadcast) throw new WhatsAppNotFoundError('Broadcast');
    return broadcast;
  }

  /** Only contacts with recorded opt-in are eligible; the rest are counted, never messaged. */
  async previewAudience(
    organizationId: string,
    input: WhatsAppBroadcastAudiencePreviewRequest,
  ): Promise<WhatsAppBroadcastAudiencePreview> {
    await this.activeChannel(organizationId, input.channelId);
    return this.broadcasts.previewAudience(organizationId, input.channelId, input.audience);
  }

  async create(
    actor: BroadcastActor,
    input: WhatsAppCreateBroadcastRequest,
  ): Promise<WhatsAppBroadcastDetail> {
    await enforceRateLimit(
      this.rateLimiter,
      WHATSAPP_RATE_LIMITS.broadcastCreate,
      `${actor.organizationId}:${actor.adminId}`,
    );
    await this.activeChannel(actor.organizationId, input.channelId);

    // Validates approval, channel ownership and variable count with sample contact values.
    await this.outbound.prepareTemplate(
      actor.organizationId,
      input.channelId,
      input.templateId,
      input.templateVariables.map((value) =>
        resolveBroadcastVariable(value, { name: 'Sample', phoneE164: '+10000000000' }),
      ),
    );

    let scheduledAt: Date | null = null;
    if (input.scheduledAt) {
      scheduledAt = new Date(input.scheduledAt);
      const now = Date.now();
      if (scheduledAt.getTime() < now - 60_000) {
        throw new WhatsAppValidationError('Choose a time in the future, or send now.');
      }
      if (scheduledAt.getTime() > now + MAX_SCHEDULE_AHEAD_MS) {
        throw new WhatsAppValidationError('Broadcasts can be scheduled up to 90 days ahead.');
      }
    }

    const preview = await this.broadcasts.previewAudience(
      actor.organizationId,
      input.channelId,
      input.audience,
    );
    if (preview.eligible === 0) {
      throw new WhatsAppPolicyError('No opted-in contacts match this audience.');
    }

    const { id } = await this.broadcasts.create({
      organizationId: actor.organizationId,
      adminId: actor.adminId,
      name: input.name,
      channelId: input.channelId,
      templateId: input.templateId,
      templateVariables: input.templateVariables,
      audience: input.audience,
      scheduledAt,
      idempotencyKey: input.idempotencyKey,
    });
    return this.get(actor.organizationId, id);
  }

  async cancel(actor: BroadcastActor, id: string): Promise<WhatsAppBroadcastDetail> {
    const cancelled = await this.broadcasts.cancel(actor.organizationId, actor.adminId, id);
    if (!cancelled)
      throw new WhatsAppPolicyError('Only scheduled or running broadcasts can be cancelled.');
    return this.get(actor.organizationId, id);
  }

  /** Worker step: sends a batch of pending recipients. Returns how many were handled. */
  async processRecipients(limit: number): Promise<number> {
    const jobs = await this.broadcasts.claimRecipients(limit);
    for (const job of jobs) await this.processRecipient(job);
    return jobs.length;
  }

  private async processRecipient(job: BroadcastRecipientJob): Promise<void> {
    if (job.consentStatus !== 'OPTED_IN') {
      await this.broadcasts.markRecipientSkipped(job.recipientId, 'Contact is no longer opted in.');
      return;
    }
    try {
      const values = job.templateVariables.map((value) =>
        resolveBroadcastVariable(value, { name: job.contactName, phoneE164: job.phoneE164 }),
      );
      const prepared = await this.outbound.prepareTemplate(
        job.organizationId,
        job.channelId,
        job.templateId,
        values,
      );
      const conversationId = await this.broadcasts.ensureConversation(
        job.organizationId,
        job.channelId,
        job.contactId,
      );
      const { messageId } = await this.messages.createOutbound({
        organizationId: job.organizationId,
        conversationId,
        adminId: job.createdByAdminId,
        type: 'TEMPLATE',
        body: prepared.preview,
        payload: prepared.payload,
        idempotencyKey: `bc_${job.recipientId}`,
        templateId: job.templateId,
        broadcastId: job.broadcastId,
        media: null,
      });
      await this.broadcasts.markRecipientQueued(job.recipientId, messageId);
      this.realtime.notify(job.organizationId);
      await this.outbound.deliver(messageId);
    } catch (error) {
      if (error instanceof WhatsAppError && error.code !== 'PROVIDER_ERROR') {
        await this.broadcasts.markRecipientFailed(job.recipientId, error.message);
      } else if (job.attemptCount >= MAX_SEND_ATTEMPTS) {
        await this.broadcasts.markRecipientFailed(job.recipientId, 'Could not queue the message.');
      } else {
        await this.broadcasts.markRecipientRetry(
          job.recipientId,
          'Temporary error while queuing the message.',
          new Date(Date.now() + retryDelayMs(job.attemptCount)),
        );
      }
    }
  }

  private async activeChannel(organizationId: string, channelId: string): Promise<void> {
    const channel = await this.channels.getCredentials(organizationId, channelId);
    if (!channel) throw new WhatsAppNotFoundError('WhatsApp channel');
    if (!channel.isActive || !channel.accessToken) {
      throw new WhatsAppPolicyError('This WhatsApp channel is disconnected.');
    }
  }
}
