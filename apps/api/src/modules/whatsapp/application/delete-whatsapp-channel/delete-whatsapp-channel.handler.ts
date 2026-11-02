import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { DeleteWhatsAppChannelCommand } from './delete-whatsapp-channel.command.js';

@Injectable()
export class DeleteWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: DeleteWhatsAppChannelCommand): Promise<void> {
    await this.channels.remove(command.ctx, command.channelId);
  }
}
