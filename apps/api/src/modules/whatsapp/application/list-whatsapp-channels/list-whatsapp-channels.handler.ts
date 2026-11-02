import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { ListWhatsAppChannelsQuery } from './list-whatsapp-channels.query.js';

@Injectable()
export class ListWhatsAppChannelsHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(query: ListWhatsAppChannelsQuery) {
    return this.channels.list(query.organizationId);
  }
}
