import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppOutboundService } from '../services/whatsapp-outbound.service.js';
import type { SendWhatsAppTextMessageCommand } from './send-whatsapp-text-message.command.js';

@Injectable()
export class SendWhatsAppTextMessageHandler {
  constructor(@Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService) {}

  async execute(command: SendWhatsAppTextMessageCommand) {
    return this.outbound.sendText(command.actor, command.conversationId, command.input);
  }
}
