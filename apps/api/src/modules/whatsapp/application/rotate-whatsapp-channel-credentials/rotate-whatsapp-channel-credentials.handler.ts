import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { RotateWhatsAppChannelCredentialsCommand } from './rotate-whatsapp-channel-credentials.command.js';

@Injectable()
export class RotateWhatsAppChannelCredentialsHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: RotateWhatsAppChannelCredentialsCommand) {
    return this.channels.rotateCredentials(command.ctx, command.channelId, command.input);
  }
}
