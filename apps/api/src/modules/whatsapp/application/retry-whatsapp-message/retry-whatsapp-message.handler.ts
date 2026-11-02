import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppOutboundService } from '../services/whatsapp-outbound.service.js';
import type { RetryWhatsAppMessageCommand } from './retry-whatsapp-message.command.js';

@Injectable()
export class RetryWhatsAppMessageHandler {
  constructor(@Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService) {}

  async execute(command: RetryWhatsAppMessageCommand) {
    return this.outbound.retry(command.actor, command.messageId);
  }
}
