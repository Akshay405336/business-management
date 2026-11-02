import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { SetWhatsAppConversationStatusCommand } from './set-whatsapp-conversation-status.command.js';

@Injectable()
export class SetWhatsAppConversationStatusHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: SetWhatsAppConversationStatusCommand) {
    return this.inbox.setStatus(command.actor, command.conversationId, command.input);
  }
}
