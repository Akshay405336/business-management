import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { UpdateWhatsAppChannelCommand } from './update-whatsapp-channel.command.js';

@Injectable()
export class UpdateWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: UpdateWhatsAppChannelCommand) {
    return this.channels.rename(command.ctx, command.channelId, command.name);
  }
}
