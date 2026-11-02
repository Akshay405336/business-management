import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { StartWhatsAppConversationCommand } from './start-whatsapp-conversation.command.js';

@Injectable()
export class StartWhatsAppConversationHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: StartWhatsAppConversationCommand) {
    return this.inbox.startConversation(command.actor, command.input);
  }
}
