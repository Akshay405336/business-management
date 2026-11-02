import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service.js';
import type { ReceiveWhatsAppWebhookCommand } from './receive-whatsapp-webhook.command.js';

@Injectable()
export class ReceiveWhatsAppWebhookHandler {
  constructor(@Inject(WhatsAppWebhookService) private readonly webhooks: WhatsAppWebhookService) {}

  async execute(command: ReceiveWhatsAppWebhookCommand): Promise<void> {
    await this.webhooks.receive(command.channelKey, command.rawBody, command.signature);
  }
}
