import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { MarkWhatsAppConversationReadCommand } from './mark-whatsapp-conversation-read.command.js';

@Injectable()
export class MarkWhatsAppConversationReadHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: MarkWhatsAppConversationReadCommand): Promise<void> {
    await this.inbox.markRead(command.actor, command.conversationId);
  }
}
