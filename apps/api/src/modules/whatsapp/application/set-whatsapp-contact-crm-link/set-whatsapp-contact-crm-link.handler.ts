import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { SetWhatsAppContactCrmLinkCommand } from './set-whatsapp-contact-crm-link.command.js';

@Injectable()
export class SetWhatsAppContactCrmLinkHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: SetWhatsAppContactCrmLinkCommand): Promise<void> {
    await this.inbox.setCrmLink(command.actor, command.contactId, command.input);
  }
}
