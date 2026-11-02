import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppOutboundService } from '../services/whatsapp-outbound.service.js';
import type { SendWhatsAppTemplateMessageCommand } from './send-whatsapp-template-message.command.js';

@Injectable()
export class SendWhatsAppTemplateMessageHandler {
  constructor(@Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService) {}

  async execute(command: SendWhatsAppTemplateMessageCommand) {
    return this.outbound.sendTemplate(command.actor, command.conversationId, command.input);
  }
}
