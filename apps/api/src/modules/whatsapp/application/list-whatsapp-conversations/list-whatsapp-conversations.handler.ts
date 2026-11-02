import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { ListWhatsAppConversationsQuery } from './list-whatsapp-conversations.query.js';

@Injectable()
export class ListWhatsAppConversationsHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: ListWhatsAppConversationsQuery) {
    return this.inbox.list(query.actor, query.query);
  }
}
