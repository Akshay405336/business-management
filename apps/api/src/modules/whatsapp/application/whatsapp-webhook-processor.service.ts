import { Inject, Injectable, Logger } from '@nestjs/common';
import { WhatsAppProviderError } from '../domain/whatsapp.errors.js';
import {
  baseMimeType,
  effectiveMediaLimit,
  MAX_WEBHOOK_ATTEMPTS,
  mediaRuleFor,
  retryDelayMs,
} from '../domain/whatsapp-policy.js';
import {
  WHATSAPP_MEDIA_STORE,
  WHATSAPP_PROVIDER,
  WHATSAPP_SETTINGS,
  type WhatsAppMediaStorePort,
  type WhatsAppProviderPort,
  type WhatsAppSettings,
} from '../domain/whatsapp.ports.js';
import { normalizeWebhookPayload } from '../domain/whatsapp-webhook-payload.js';
import { WhatsAppRealtimeService } from './whatsapp-realtime.service.js';
import {
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_MESSAGE_STORE,
  WHATSAPP_WEBHOOK_EVENT_STORE,
  type ChannelCredentialsRecord,
  type ClaimedWebhookEvent,
  type InboundIngestResult,
  type WhatsAppChannelStore,
  type WhatsAppMessageStore,
  type WhatsAppWebhookEventStore,
} from './whatsapp.stores.js';

/** Receipts may arrive before the send response is stored; give them a few chances to match. */
const UNKNOWN_RECEIPT_ATTEMPTS = 3;

@Injectable()
export class WhatsAppWebhookProcessor {
  private readonly logger = new Logger(WhatsAppWebhookProcessor.name);

  constructor(
    @Inject(WHATSAPP_WEBHOOK_EVENT_STORE) private readonly events: WhatsAppWebhookEventStore,
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_MESSAGE_STORE) private readonly messages: WhatsAppMessageStore,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(WHATSAPP_MEDIA_STORE) private readonly mediaStore: WhatsAppMediaStorePort,
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
    @Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService,
  ) {}

  processInBackground(eventId: string): void {
    setImmediate(() => {
      this.processPending(1, eventId).catch((error: unknown) => {
        this.logger.warn(
          `Webhook event ${eventId} processing deferred: ${error instanceof Error ? error.name : 'unknown'}`,
        );
      });
    });
  }

  async processPending(limit: number, eventId?: string): Promise<number> {
    const claimed = await this.events.claim(limit, eventId);
    for (const event of claimed) await this.processOne(event);
    return claimed.length;
  }

  private async processOne(event: ClaimedWebhookEvent): Promise<void> {
    try {
      const channel = await this.channels.getCredentialsForWorker(event.channelId);
      if (!channel || channel.organizationId !== event.organizationId) {
        await this.events.markFailed(event.id, 'Channel no longer exists.');
        return;
      }
      const batch = normalizeWebhookPayload(event.payload, {
        businessAccountId: channel.businessAccountId,
        phoneNumberId: channel.phoneNumberId,
      });
      if (batch.foreignChanges > 0) {
        this.logger.warn(
          `Ignored ${batch.foreignChanges} change(s) not addressed to channel ${channel.id}`,
        );
      }

      const channelRef = { id: channel.id, organizationId: channel.organizationId };
      let changed = false;
      for (const message of batch.messages) {
        const ingested = await this.messages.ingestInbound(channelRef, message);
        if (!ingested) continue;
        changed = true;
        if (ingested.media) await this.storeInboundMedia(channel, ingested);
      }

      let unmatchedReceipts = 0;
      for (const receipt of batch.statuses) {
        const result = await this.messages.applyReceipt(channel.id, receipt);
        if (!result.known) unmatchedReceipts += 1;
        if (result.applied) changed = true;
      }

      for (const update of batch.templateUpdates) {
        await this.messages.applyTemplateStatus(channel.id, update);
      }

      if (changed) this.realtime.notify(channel.organizationId);

      if (unmatchedReceipts > 0 && event.attemptCount < UNKNOWN_RECEIPT_ATTEMPTS) {
        await this.events.markRetry(
          event.id,
          `${unmatchedReceipts} receipt(s) waiting for their message`,
          new Date(Date.now() + retryDelayMs(event.attemptCount)),
        );
        return;
      }
      await this.events.markProcessed(event.id);
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
      if (event.attemptCount >= MAX_WEBHOOK_ATTEMPTS) {
        this.logger.error(`Webhook event ${event.id} failed permanently`);
        await this.events.markFailed(event.id, reason);
      } else {
        await this.events.markRetry(
          event.id,
          reason,
          new Date(Date.now() + retryDelayMs(event.attemptCount)),
        );
      }
    }
  }

  /**
   * Media is fetched server-side from Meta using the media ID (never a URL from the
   * payload), checked against type and size limits, then kept in object storage.
   */
  private async storeInboundMedia(
    channel: ChannelCredentialsRecord,
    ingested: InboundIngestResult,
  ): Promise<void> {
    const media = ingested.media;
    if (!media) return;
    const fail = async (reason: string) => {
      await this.messages.attachInboundMedia(ingested.messageId, { ok: false, reason });
    };
    if (!channel.accessToken)
      return fail('The channel was disconnected before the media could be downloaded.');
    const declaredRule = mediaRuleFor(media.mimeType);
    if (!declaredRule) return fail('This file type is not accepted.');
    try {
      const file = await this.provider.downloadMedia(
        {
          accessToken: channel.accessToken,
          businessAccountId: channel.businessAccountId,
          phoneNumberId: channel.phoneNumberId,
        },
        media.providerMediaId,
        effectiveMediaLimit(declaredRule, this.settings.mediaMaxBytes),
      );
      const mimeType = baseMimeType(file.mimeType || media.mimeType);
      const rule = mediaRuleFor(mimeType);
      if (!rule) return fail('This file type is not accepted.');
      const fileName =
        (media.fileName ?? '')
          .replace(/[^\w.\- ]+/g, '_')
          .trim()
          .slice(0, 120) || `whatsapp-${ingested.messageId.slice(0, 8)}.${rule.extension}`;
      const stored = await this.mediaStore.store({
        organizationId: channel.organizationId,
        adminId: channel.createdByAdminId,
        buffer: file.buffer,
        mimeType,
        fileName,
        extension: rule.extension,
      });
      await this.messages.attachInboundMedia(ingested.messageId, {
        ok: true,
        storedObjectId: stored.storedObjectId,
        mimeType,
        sizeBytes: stored.sizeBytes,
        fileName,
      });
    } catch (error) {
      if (error instanceof WhatsAppProviderError) {
        if (error.credentialProblem) {
          await this.channels.markCredentialProblem(channel.id, error.providerCode, error.message);
        }
        return fail(error.message);
      }
      this.logger.warn(
        `Media storage failed for message ${ingested.messageId}: ${error instanceof Error ? error.name : 'unknown'}`,
      );
      return fail('The attachment could not be stored.');
    }
  }
}
