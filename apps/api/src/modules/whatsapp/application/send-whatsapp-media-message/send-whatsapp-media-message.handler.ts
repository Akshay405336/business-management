import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppOutboundService } from '../services/whatsapp-outbound.service.js';
import type { SendWhatsAppMediaMessageCommand } from './send-whatsapp-media-message.command.js';

@Injectable()
export class SendWhatsAppMediaMessageHandler {
  constructor(@Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService) {}

  async execute(command: SendWhatsAppMediaMessageCommand) {
    return this.outbound.sendMedia(command.actor, command.conversationId, command.file, command.fields);
  }
}
