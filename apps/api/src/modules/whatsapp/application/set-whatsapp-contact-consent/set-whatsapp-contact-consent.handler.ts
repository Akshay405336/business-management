import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { SetWhatsAppContactConsentCommand } from './set-whatsapp-contact-consent.command.js';

@Injectable()
export class SetWhatsAppContactConsentHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(command: SetWhatsAppContactConsentCommand): Promise<void> {
    await this.inbox.setConsent(command.actor, command.contactId, command.input);
  }
}
