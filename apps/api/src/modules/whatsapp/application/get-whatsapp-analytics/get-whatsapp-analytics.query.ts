import type { WhatsAppAnalyticsQuery } from "@techwin/validation";
export interface GetWhatsAppAnalyticsQuery {
  readonly organizationId: string;
  readonly query: WhatsAppAnalyticsQuery;
}
