import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { ListWhatsAppAssigneesQuery } from './list-whatsapp-assignees.query.js';

@Injectable()
export class ListWhatsAppAssigneesHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: ListWhatsAppAssigneesQuery) {
    return this.inbox.assignees(query.actor);
  }
}
