import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { GetWhatsAppConversationQuery } from './get-whatsapp-conversation.query.js';

@Injectable()
export class GetWhatsAppConversationHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: GetWhatsAppConversationQuery) {
    return this.inbox.detail(query.actor, query.conversationId);
  }
}
