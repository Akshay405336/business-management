import type { WhatsAppTemplateListQuery } from "@techwin/validation";
export interface ListWhatsAppTemplatesQuery {
  readonly organizationId: string;
  readonly query: WhatsAppTemplateListQuery;
}
