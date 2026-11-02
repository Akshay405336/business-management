import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppTemplateService } from '../services/whatsapp-template.service.js';
import type { CreateWhatsAppTemplateCommand } from './create-whatsapp-template.command.js';

@Injectable()
export class CreateWhatsAppTemplateHandler {
  constructor(@Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService) {}

  async execute(command: CreateWhatsAppTemplateCommand) {
    return this.templates.submit(command.ctx, command.input);
  }
}
