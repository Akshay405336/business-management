import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppBroadcastService } from '../services/whatsapp-broadcast.service.js';
import type { PreviewWhatsAppBroadcastAudienceCommand } from './preview-whatsapp-broadcast-audience.command.js';

@Injectable()
export class PreviewWhatsAppBroadcastAudienceHandler {
  constructor(@Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService) {}

  async execute(command: PreviewWhatsAppBroadcastAudienceCommand) {
    return this.broadcasts.previewAudience(command.organizationId, command.input);
  }
}
