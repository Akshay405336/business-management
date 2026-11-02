import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppBroadcastService } from '../services/whatsapp-broadcast.service.js';
import type { CreateWhatsAppBroadcastCommand } from './create-whatsapp-broadcast.command.js';

@Injectable()
export class CreateWhatsAppBroadcastHandler {
  constructor(@Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService) {}

  async execute(command: CreateWhatsAppBroadcastCommand) {
    return this.broadcasts.create(command.ctx, command.input);
  }
}
