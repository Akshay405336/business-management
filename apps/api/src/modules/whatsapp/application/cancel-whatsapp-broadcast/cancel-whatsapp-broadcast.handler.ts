import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppBroadcastService } from '../services/whatsapp-broadcast.service.js';
import type { CancelWhatsAppBroadcastCommand } from './cancel-whatsapp-broadcast.command.js';

@Injectable()
export class CancelWhatsAppBroadcastHandler {
  constructor(@Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService) {}

  async execute(command: CancelWhatsAppBroadcastCommand) {
    return this.broadcasts.cancel(command.ctx, command.broadcastId);
  }
}
