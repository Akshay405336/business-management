import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { AssignWhatsAppConversationCommand } from './assign-whatsapp-conversation.command.js';

@Injectable()
export class AssignWhatsAppConversationHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: AssignWhatsAppConversationCommand) {
    return this.inbox.assign(command.actor, command.conversationId, command.input);
  }
}
