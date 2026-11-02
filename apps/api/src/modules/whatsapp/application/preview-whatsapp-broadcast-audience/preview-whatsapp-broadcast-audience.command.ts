import type { WhatsAppBroadcastAudiencePreviewRequest } from "@techwin/validation";
export interface PreviewWhatsAppBroadcastAudienceCommand {
  readonly organizationId: string;
  readonly input: WhatsAppBroadcastAudiencePreviewRequest;
}
