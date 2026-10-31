import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  WHATSAPP_DISTRIBUTED_LOCK,
  WHATSAPP_SETTINGS,
  type WhatsAppDistributedLockPort,
  type WhatsAppSettings,
} from '../domain/whatsapp.ports.js';
import { WhatsAppBroadcastService } from './whatsapp-broadcast.service.js';
import { WhatsAppOutboundService } from './whatsapp-outbound.service.js';
import { WhatsAppWebhookProcessor } from './whatsapp-webhook-processor.service.js';
import {
  WHATSAPP_BROADCAST_STORE,
  WHATSAPP_MESSAGE_STORE,
  type WhatsAppBroadcastStore,
  type WhatsAppMessageStore,
} from './whatsapp.stores.js';

const TICK_MS = 2_000;
const LOCK_TTL_MS = 60_000;
const STUCK_SENDING_MS = 10 * 60_000;
const WEBHOOK_BATCH = 20;
const RETRY_BATCH = 25;
const RECIPIENT_BATCH = 25;

/**
 * Background work: webhook retries, outbound retries, stuck-send recovery and
 * broadcast dispatch. Rows are claimed in the database, so several API
 * instances may run this safely; the Redis lock only avoids wasted work.
 */
@Injectable()
export class WhatsAppJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppJobRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
    @Inject(WHATSAPP_DISTRIBUTED_LOCK) private readonly lock: WhatsAppDistributedLockPort,
    @Inject(WHATSAPP_MESSAGE_STORE) private readonly messages: WhatsAppMessageStore,
    @Inject(WHATSAPP_BROADCAST_STORE) private readonly broadcasts: WhatsAppBroadcastStore,
    @Inject(WhatsAppWebhookProcessor) private readonly webhookProcessor: WhatsAppWebhookProcessor,
    @Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService,
    @Inject(WhatsAppBroadcastService) private readonly broadcastService: WhatsAppBroadcastService,
  ) {}

  onModuleInit(): void {
    if (!this.settings.workerEnabled) {
      this.logger.log('WhatsApp background worker disabled (WHATSAPP_WORKER_ENABLED=false).');
      return;
    }
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.lock.runExclusive('whatsapp:jobs', LOCK_TTL_MS, () => this.runOnce());
    } catch (error) {
      this.logger.warn(
        `WhatsApp job tick failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async runOnce(): Promise<void> {
    await this.webhookProcessor.processPending(WEBHOOK_BATCH);

    const failed = await this.messages.failStuckSending(new Date(Date.now() - STUCK_SENDING_MS));
    if (failed > 0) this.logger.warn(`Marked ${failed} interrupted WhatsApp send(s) as failed.`);

    for (const messageId of await this.messages.claimDueRetries(RETRY_BATCH)) {
      await this.outbound.deliver(messageId);
    }

    await this.broadcasts.startDue(new Date());
    await this.broadcastService.processRecipients(RECIPIENT_BATCH);
    const completed = await this.broadcasts.completeFinished();
    if (completed > 0) this.logger.log(`Completed ${completed} WhatsApp broadcast(s).`);
  }
}
