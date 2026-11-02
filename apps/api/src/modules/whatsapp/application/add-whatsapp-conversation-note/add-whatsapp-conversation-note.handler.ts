import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { AddWhatsAppConversationNoteCommand } from './add-whatsapp-conversation-note.command.js';

@Injectable()
export class AddWhatsAppConversationNoteHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: AddWhatsAppConversationNoteCommand): Promise<void> {
    await this.inbox.addNote(command.actor, command.conversationId, command.body);
  }
}
