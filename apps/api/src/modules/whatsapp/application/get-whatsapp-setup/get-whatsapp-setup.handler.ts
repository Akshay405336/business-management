import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppChannelService } from '../services/whatsapp-channel.service.js';
import type { GetWhatsAppSetupQuery } from './get-whatsapp-setup.query.js';
import type { WhatsAppSetupInfo } from "@techwin/contracts";

@Injectable()
export class GetWhatsAppSetupHandler {
  constructor(@Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService) {}

  execute(_query: GetWhatsAppSetupQuery): WhatsAppSetupInfo {
    return this.channels.setupInfo();
  }
}
