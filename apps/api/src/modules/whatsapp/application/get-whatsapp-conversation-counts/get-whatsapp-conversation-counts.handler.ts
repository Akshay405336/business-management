import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { GetWhatsAppConversationCountsQuery } from './get-whatsapp-conversation-counts.query.js';

@Injectable()
export class GetWhatsAppConversationCountsHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: GetWhatsAppConversationCountsQuery) {
    return this.inbox.counts(query.actor);
  }
}
