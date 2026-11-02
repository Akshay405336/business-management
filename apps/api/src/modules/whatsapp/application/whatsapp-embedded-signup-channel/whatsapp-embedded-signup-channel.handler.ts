import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { WhatsAppEmbeddedSignupChannelCommand } from './whatsapp-embedded-signup-channel.command.js';

@Injectable()
export class WhatsAppEmbeddedSignupChannelHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  async execute(command: WhatsAppEmbeddedSignupChannelCommand) {
    return this.channels.embeddedSignup(command.ctx, command.input);
  }
}
