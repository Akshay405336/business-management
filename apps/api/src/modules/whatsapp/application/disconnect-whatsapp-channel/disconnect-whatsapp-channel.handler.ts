import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { DisconnectWhatsAppChannelCommand } from './disconnect-whatsapp-channel.command.js';

@Injectable()
export class DisconnectWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: DisconnectWhatsAppChannelCommand) {
    return this.channels.disconnect(command.ctx, command.channelId);
  }
}
