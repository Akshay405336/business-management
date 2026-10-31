import { Inject, Injectable } from '@nestjs/common';
import type { WhatsAppAnalyticsResponse } from '@techwin/contracts';
import type { WhatsAppAnalyticsQuery } from '@techwin/validation';
import { WhatsAppValidationError } from '../domain/whatsapp.errors.js';
import { WHATSAPP_ANALYTICS_STORE, type WhatsAppAnalyticsStore } from './whatsapp.stores.js';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class WhatsAppAnalyticsService {
  constructor(
    @Inject(WHATSAPP_ANALYTICS_STORE) private readonly analytics: WhatsAppAnalyticsStore,
  ) {}

  summary(
    organizationId: string,
    query: WhatsAppAnalyticsQuery,
  ): Promise<WhatsAppAnalyticsResponse> {
    if (query.from && query.to) {
      const days = (Date.parse(query.to) - Date.parse(query.from)) / 86_400_000;
      if (days < 0)
        throw new WhatsAppValidationError('The start date must be before the end date.');
      if (days > MAX_RANGE_DAYS)
        throw new WhatsAppValidationError('Choose a range of at most one year.');
    }
    return this.analytics.summary(organizationId, query);
  }
}
