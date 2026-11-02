import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppBroadcastService } from '../services/whatsapp-broadcast.service.js';
import type { ListWhatsAppBroadcastsQuery } from './list-whatsapp-broadcasts.query.js';

@Injectable()
export class ListWhatsAppBroadcastsHandler {
  constructor(@Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService) {}

  async execute(query: ListWhatsAppBroadcastsQuery) {
    return this.broadcasts.list(query.organizationId);
  }
}
