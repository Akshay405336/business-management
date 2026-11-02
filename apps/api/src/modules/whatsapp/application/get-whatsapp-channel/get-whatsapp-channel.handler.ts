import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { GetWhatsAppChannelQuery } from './get-whatsapp-channel.query.js';

@Injectable()
export class GetWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(query: GetWhatsAppChannelQuery) {
    return this.channels.get(query.organizationId, query.channelId);
  }
}
