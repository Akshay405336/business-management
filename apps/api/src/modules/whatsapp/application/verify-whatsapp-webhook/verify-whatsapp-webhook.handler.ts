import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service.js';
import type { VerifyWhatsAppWebhookQuery } from './verify-whatsapp-webhook.query.js';

@Injectable()
export class VerifyWhatsAppWebhookHandler {
  constructor(@Inject(WhatsAppWebhookService) private readonly webhooks: WhatsAppWebhookService) {}

  async execute(query: VerifyWhatsAppWebhookQuery) {
    return this.webhooks.verifySubscription(query.channelKey, {
      mode: query.mode,
      token: query.token,
      challenge: query.challenge,
    });
  }
}
