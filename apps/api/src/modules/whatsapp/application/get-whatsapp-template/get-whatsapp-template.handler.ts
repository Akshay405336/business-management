import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service.js';
import type { GetWhatsAppTemplateQuery } from './get-whatsapp-template.query.js';

@Injectable()
export class GetWhatsAppTemplateHandler {
  constructor(@Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService) {}

  async execute(query: GetWhatsAppTemplateQuery) {
    return this.templates.get(query.organizationId, query.templateId);
  }
}
