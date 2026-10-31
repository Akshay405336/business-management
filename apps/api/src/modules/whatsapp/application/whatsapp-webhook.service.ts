import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RATE_LIMITER,
  type RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';
import { WhatsAppNotFoundError, WhatsAppWebhookRejectedError } from '../domain/whatsapp.errors.js';
import { WHATSAPP_SETTINGS, type WhatsAppSettings } from '../domain/whatsapp.ports.js';
import { enforceRateLimit, WHATSAPP_RATE_LIMITS } from './whatsapp-access.js';
import { WhatsAppWebhookProcessor } from './whatsapp-webhook-processor.service.js';
import {
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_WEBHOOK_EVENT_STORE,
  type WhatsAppChannelStore,
  type WhatsAppWebhookEventStore,
} from './whatsapp.stores.js';

const WEBHOOK_KEY = /^[A-Za-z0-9_-]{16,64}$/;
const CHALLENGE = /^[A-Za-z0-9_.-]{1,256}$/;

function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function constantTimeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Meta webhook intake. The channel (and therefore the organization) comes only
 * from the secret per-channel URL key; payload contents never select a tenant.
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_WEBHOOK_EVENT_STORE) private readonly events: WhatsAppWebhookEventStore,
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(WhatsAppWebhookProcessor) private readonly processor: WhatsAppWebhookProcessor,
  ) {}

  /** Meta's subscription handshake (GET with hub.mode, hub.verify_token, hub.challenge). */
  async verifySubscription(
    webhookKey: string,
    query: { mode?: unknown; token?: unknown; challenge?: unknown },
  ): Promise<string> {
    if (!WEBHOOK_KEY.test(webhookKey)) throw new WhatsAppNotFoundError('Webhook');
    await enforceRateLimit(this.rateLimiter, WHATSAPP_RATE_LIMITS.webhook, webhookKey);
    const channel = await this.channels.findForWebhook(webhookKey);
    if (!channel || !channel.isActive) throw new WhatsAppNotFoundError('Webhook');
    const { mode, token, challenge } = query;
    if (
      mode !== 'subscribe' ||
      typeof token !== 'string' ||
      typeof challenge !== 'string' ||
      !CHALLENGE.test(challenge) ||
      !channel.verifyTokenHash ||
      !constantTimeEqualHex(sha256Hex(token), channel.verifyTokenHash)
    ) {
      throw new WhatsAppWebhookRejectedError();
    }
    await this.channels.markWebhookVerified(channel.id);
    return challenge;
  }

  /**
   * Verifies the X-Hub-Signature-256 HMAC over the exact raw body, persists the
   * event (deduplicated by payload hash) and acknowledges. Processing is async.
   */
  async receive(
    webhookKey: string,
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    if (!WEBHOOK_KEY.test(webhookKey)) throw new WhatsAppNotFoundError('Webhook');
    await enforceRateLimit(this.rateLimiter, WHATSAPP_RATE_LIMITS.webhook, webhookKey);
    const channel = await this.channels.findForWebhook(webhookKey);
    if (!channel) throw new WhatsAppNotFoundError('Webhook');

    const secret = channel.appSecret ?? this.settings.defaultAppSecret;
    if (!secret || !rawBody || rawBody.length === 0 || typeof signature !== 'string') {
      throw new WhatsAppWebhookRejectedError();
    }
    const provided = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (
      !/^[a-f0-9]{64}$/i.test(provided) ||
      !constantTimeEqualHex(provided.toLowerCase(), expected)
    ) {
      this.logger.warn(`Rejected webhook with an invalid signature for channel ${channel.id}`);
      throw new WhatsAppWebhookRejectedError();
    }

    // Disconnected channels still get a 200 so Meta stops retrying, but nothing is stored.
    if (!channel.isActive) return;

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new WhatsAppWebhookRejectedError();
    }
    if ((payload as { object?: unknown } | null)?.object !== 'whatsapp_business_account') return;

    const { eventId, duplicate } = await this.events.persist(
      { id: channel.id, organizationId: channel.organizationId },
      sha256Hex(rawBody),
      payload,
    );
    await this.channels.markWebhookReceived(channel.id);
    if (!duplicate) this.processor.processInBackground(eventId);
  }
}
