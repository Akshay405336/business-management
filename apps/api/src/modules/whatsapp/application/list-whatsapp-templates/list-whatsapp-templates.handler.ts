import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service.js';
import type { ListWhatsAppTemplatesQuery } from './list-whatsapp-templates.query.js';

@Injectable()
export class ListWhatsAppTemplatesHandler {
  constructor(@Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService) {}

  async execute(query: ListWhatsAppTemplatesQuery) {
    return this.templates.list(query.organizationId, query.query);
  }
}
