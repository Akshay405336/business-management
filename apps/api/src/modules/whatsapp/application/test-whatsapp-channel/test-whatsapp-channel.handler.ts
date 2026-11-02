import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { TestWhatsAppChannelCommand } from './test-whatsapp-channel.command.js';

@Injectable()
export class TestWhatsAppChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: TestWhatsAppChannelCommand) {
    return this.channels.test(command.ctx, command.channelId);
  }
}
