import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppInboxService } from '../services/whatsapp-inbox.service.js';
import type { OpenWhatsAppMessageMediaQuery } from './open-whatsapp-message-media.query.js';

@Injectable()
export class OpenWhatsAppMessageMediaHandler {
  constructor(@Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService) {}

  async execute(query: OpenWhatsAppMessageMediaQuery) {
    return this.inbox.openMedia(query.actor, query.messageId);
  }
}
