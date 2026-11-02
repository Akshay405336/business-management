import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { CreateWhatsAppChannelCommand } from './create-whatsapp-channel.command.js';

@Injectable()
export class CreateWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: CreateWhatsAppChannelCommand) {
    return this.channels.create(command.ctx, command.input);
  }
}
