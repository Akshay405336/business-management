import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppAnalyticsService } from '../services/whatsapp-analytics.service.js';
import type { GetWhatsAppAnalyticsQuery } from './get-whatsapp-analytics.query.js';

@Injectable()
export class GetWhatsAppAnalyticsHandler {
  constructor(@Inject(WhatsAppAnalyticsService) private readonly analytics: WhatsAppAnalyticsService) {}

  async execute(query: GetWhatsAppAnalyticsQuery) {
    return this.analytics.summary(query.organizationId, query.query);
  }
}
