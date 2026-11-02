import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { GetWhatsAppConversationTimelineQuery } from './get-whatsapp-conversation-timeline.query.js';

@Injectable()
export class GetWhatsAppConversationTimelineHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: GetWhatsAppConversationTimelineQuery) {
    return this.inbox.timeline(query.actor, query.conversationId, query.query);
  }
}
