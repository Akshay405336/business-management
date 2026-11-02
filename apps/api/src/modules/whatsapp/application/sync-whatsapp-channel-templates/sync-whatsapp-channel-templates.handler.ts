import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service.js';
import type { SyncWhatsAppChannelTemplatesCommand } from './sync-whatsapp-channel-templates.command.js';

@Injectable()
export class SyncWhatsAppChannelTemplatesHandler {
  constructor(@Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService) {}

  async execute(command: SyncWhatsAppChannelTemplatesCommand) {
    return this.templates.sync(command.ctx, command.channelId);
  }
}
