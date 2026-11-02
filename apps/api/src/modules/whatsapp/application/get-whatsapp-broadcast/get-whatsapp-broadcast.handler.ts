import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppBroadcastService } from '../services/whatsapp-broadcast.service.js';
import type { GetWhatsAppBroadcastQuery } from './get-whatsapp-broadcast.query.js';

@Injectable()
export class GetWhatsAppBroadcastHandler {
  constructor(@Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService) {}

  async execute(query: GetWhatsAppBroadcastQuery) {
    return this.broadcasts.get(query.organizationId, query.broadcastId);
  }
}
